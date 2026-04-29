/**
 * cms_page_replace_form_widget ツール
 *
 * HubSpot CMS のランディングページ／サイトページに埋め込まれた form widget を、
 * 指定の oldFormId から newFormId へ一括差し替えする。
 *
 * 背景:
 *   - LP内のフォームを差し替えるとき、layoutSections だけでなく widgets / widgetContainers
 *     にも form widget が散在する可能性がある。
 *   - body.form.form_id を再帰的に探索して書き換え、ページ構造全体を再送信することで実現する。
 *
 * HubSpot公式の form widget 構造（CMS Pages API）:
 *   {
 *     "type": "module",
 *     "body": {
 *       "module_id": 1155238,
 *       "widget_name": "Form",
 *       "form": {
 *         "form_id": "<UUID>",
 *         "form_type": "HUBSPOT",
 *         "message": "...",
 *         "response_type": "inline" | "redirect",
 *         "redirect_id": null,
 *         "redirect_url": null
 *       }
 *     }
 *   }
 *
 * 仕様参照:
 *   - HubSpot Community: https://community.hubspot.com/t5/APIs-Integrations/Create-Landing-Page-from-a-template-containing-a-Form-Module-via/td-p/251421
 *   - HubSpot Docs (CMS Pages API guide):
 *     https://developers.hubspot.com/docs/api-reference/cms-pages-v3/guide
 *     "you must include the full definition of the object"
 *
 * 動作モード:
 *   - useDraft=false (default): 公開ページを直接 PATCH（即時反映）
 *   - useDraft=true: draft を更新。pushLive=true なら続けて push-live まで実行。
 *
 * 副作用:
 *   - HubSpot CMS の form widget は body.form.form_id 以外にも response_type / message /
 *     redirect_url 等の付随設定を持つ。これらは既存値を維持する（form_id だけを差し替える）。
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { formatToolResult, prettyParam } from "@/lib/mcp/utils/format-result";
import {
  getCmsPage,
  getCmsPageDraft,
  updateCmsPage,
  updateCmsPageDraft,
  pushCmsPageDraftLive,
} from "../../hubspot/crm-client";

/**
 * オブジェクトを再帰走査して form widget の form_id を書き換える。
 *
 * 判定ロジック:
 *   1. obj.body.form.form_id === oldFormId →  obj.body.form.form_id = newFormId
 *   2. obj.form.form_id === oldFormId      →  obj.form.form_id = newFormId
 *      （ネストの浅い表現を採るテンプレートに対応）
 *
 * 戻り値: 置換した件数
 *
 * 走査対象は配列・オブジェクトの全プロパティを再帰的に降りる。
 * 文字列・数値・boolean・null は再帰しない。
 */
function replaceFormIdRecursively(
  obj: unknown,
  oldFormId: string,
  newFormId: string
): number {
  let replacedCount = 0;

  if (obj === null || obj === undefined) return 0;
  if (typeof obj !== "object") return 0;

  // 配列
  if (Array.isArray(obj)) {
    for (const item of obj) {
      replacedCount += replaceFormIdRecursively(item, oldFormId, newFormId);
    }
    return replacedCount;
  }

  // オブジェクト
  const o = obj as Record<string, unknown>;

  // パターン1: body.form.form_id
  const body = o.body;
  if (body && typeof body === "object" && !Array.isArray(body)) {
    const bodyObj = body as Record<string, unknown>;
    const form = bodyObj.form;
    if (form && typeof form === "object" && !Array.isArray(form)) {
      const formObj = form as Record<string, unknown>;
      if (formObj.form_id === oldFormId) {
        formObj.form_id = newFormId;
        replacedCount++;
      }
    }
  }

  // パターン2: トップレベルの form.form_id（古いテンプレート対応）
  const form = o.form;
  if (form && typeof form === "object" && !Array.isArray(form)) {
    const formObj = form as Record<string, unknown>;
    if (formObj.form_id === oldFormId) {
      formObj.form_id = newFormId;
      replacedCount++;
    }
  }

  // 全プロパティを再帰
  for (const key of Object.keys(o)) {
    replacedCount += replaceFormIdRecursively(o[key], oldFormId, newFormId);
  }

  return replacedCount;
}

export function registerCmsPageReplaceFormWidget(server: McpServer) {
  server.tool(
    "cms_page_replace_form_widget",
    `LP/サイトページ内のフォームウィジェット（form_id）を一括差し替えする。

【動作】
1. 対象ページの完全な定義（widgets / widgetContainers / layoutSections 全て含む）を取得。
2. 構造全体を再帰走査し、body.form.form_id（または form.form_id）が oldFormId と一致する箇所を検出。
3. 検出した form_id を全て newFormId に書き換え、ページ構造全体を PATCH で送信。

【useDraft オプション】
- useDraft=false (デフォルト): 公開ページに直接反映（PATCH /cms/v3/pages/{type}/{id}）
- useDraft=true: draft 版を更新（PATCH /cms/v3/pages/{type}/{id}/draft）
  - pushLive=true なら、続けて draft/push-live を呼び出し本番に反映

【注意】
- form_id 以外の form 設定（response_type, message, redirect_url 等）は維持される。
- HubSpot公式ドキュメント: ネストプロパティ更新時は構造全体（フル定義）の送信が必須。
- マッチが0件だった場合はエラーで終了する（誤った oldFormId 指定の検出のため）。

【返却】
- replacedCount: 差し替えた form widget の数
- pageId, pageType
- oldFormId, newFormId
- 更新後のページの id / state / updatedAt`,
    {
      pageType: z
        .enum(["landing-pages", "site-pages"])
        .describe(
          "ページ種別: landing-pages（ランディングページ）または site-pages（サイトページ）"
        ),
      pageId: z
        .string()
        .describe(
          "ページレコードID（数値文字列）。cms_page_listの返却値のidから取得"
        ),
      oldFormId: z
        .string()
        .describe(
          "差し替え元のフォームUUID。例: '8da1a71a-848a-4f5e-998b-2ac4a0e6e255'"
        ),
      newFormId: z
        .string()
        .describe("差し替え先のフォームUUID。form_create の返却値などから取得"),
      useDraft: z
        .boolean()
        .optional()
        .describe(
          "true=draft版を更新（公開ページには影響しない、後で push-live が必要）。" +
            "false（デフォルト）=公開ページを直接更新。"
        ),
      pushLive: z
        .boolean()
        .optional()
        .describe(
          "useDraft=true のときのみ有効。true=draft更新後に自動で push-live を実行する。" +
            "デフォルト false（draftだけ作って手動で push-live する想定）。"
        ),
    
      pretty: prettyParam,
},
    async ({ pageType, pageId, oldFormId, newFormId, useDraft, pushLive, pretty }) => {
      try {
        // ① ページ取得（draft or published）
        const page = useDraft
          ? await getCmsPageDraft(pageType, pageId)
          : await getCmsPage(pageType, pageId);

        // ② 再帰走査して form_id 置換
        // page 全体を走査対象にする（widgets / widgetContainers / layoutSections のいずれにあっても対応）
        const replacedCount = replaceFormIdRecursively(
          page,
          oldFormId,
          newFormId
        );

        if (replacedCount === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text:
                  `エラー: oldFormId="${oldFormId}" がページ内に見つかりませんでした。\n` +
                  `pageId=${pageId}, pageType=${pageType}, useDraft=${useDraft ?? false}\n` +
                  `widgets / widgetContainers / layoutSections の全体を再帰走査しましたが、` +
                  `body.form.form_id または form.form_id でマッチする箇所はありませんでした。\n` +
                  `cms_page_list (full=true) でページ構造を取得し、実際の form_id を確認してください。`,
              },
            ],
            isError: true,
          };
        }

        // ③ 更新時に必要な3プロパティのみを抽出して送信する
        // （ページ全体を PATCH で送ると読み取り専用フィールドで弾かれる可能性があるため、
        //   実際に書き換えた可能性のある widgets / widgetContainers / layoutSections のみ送る）
        const pageObj = page as Record<string, unknown>;
        const updates: Record<string, unknown> = {};
        if (pageObj.widgets !== undefined) updates.widgets = pageObj.widgets;
        if (pageObj.widgetContainers !== undefined)
          updates.widgetContainers = pageObj.widgetContainers;
        if (pageObj.layoutSections !== undefined)
          updates.layoutSections = pageObj.layoutSections;

        // ④ PATCH 実行（draft / published）
        const updated = useDraft
          ? await updateCmsPageDraft(pageType, pageId, updates)
          : await updateCmsPage(pageType, pageId, updates);

        // ⑤ オプションで push-live
        let pushLiveResult: unknown = null;
        if (useDraft && pushLive) {
          pushLiveResult = await pushCmsPageDraftLive(pageType, pageId);
        }

        const summary = {
          replacedCount,
          pageId,
          pageType,
          oldFormId,
          newFormId,
          mode: useDraft ? "draft" : "published",
          pushLiveExecuted: !!(useDraft && pushLive),
          updatedPage: {
            id: updated.id,
            state: updated.state,
            updatedAt: updated.updatedAt,
          },
          pushLiveResponse: pushLiveResult,
        };

        return {
          content: [
            {
              type: "text" as const,
              text:
                `✅ form widget 差し替え完了\n` +
                `差し替え件数: ${replacedCount}\n` +
                `ページ: ${pageId} (${pageType})\n` +
                `モード: ${useDraft ? "draft" : "published（即時反映）"}\n` +
                `${useDraft && pushLive ? "→ push-live まで実行済み\n" : ""}\n` +
                `詳細:\n${formatToolResult(summary, pretty)}`,
            },
          ],
        };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: "text" as const,
              text: `エラー: form widget の差し替えに失敗しました。\n${message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
