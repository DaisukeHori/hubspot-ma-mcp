import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  updateCmsPage,
  updateCmsPageDraft,
  pushCmsPageDraftLive,
} from "../../hubspot/crm-client";

export function registerCmsPageUpdate(server: McpServer) {
  server.tool(
    "cms_page_update",
    `HubSpot CMS のランディングページまたはサイトページを更新する。

【layoutSections / widgets / widgetContainers について】
LP/サイトページのモジュール（フォーム埋め込み、リッチテキスト、画像等）は3箇所のいずれかに格納される:
  - widgets:           テンプレートに直接配置されたモジュール
  - widgetContainers:  flex column 内のモジュール
  - layoutSections:    drag-and-drop area（dnd_area）内のモジュール

【公式ドキュメントの注意（重要）】
"The properties provided in the supplied payload will override the existing draft properties
 without any complex merging logic. Consequently, when updating nested properties such as those
 within the widgets, widgetContainers, or layoutSections of the page, you must include the full
 definition of the object."
→ 子要素の一部だけ書き換える場合でも、構造全体（フル定義）を送信する必要がある。
→ form_id 差し替えのような典型作業は、専用ツール cms_page_replace_form_widget の利用を推奨。

【layoutSections の構造（実物例）】
layoutSections = {
  "<sectionId>": {
    "name": "...",
    "rows": [...],
    "type": "section",
    "cells": [...]
  },
  ...
}
中身は HubSpot 側の独自構造のため z.record(z.unknown()) で素通しする。

【useDraft / pushLive オプション】
- useDraft=false (デフォルト): 公開ページを直接 PATCH（即時反映）
- useDraft=true: draft 版を更新（公開には反映されない）
  - pushLive=true なら、続けて push-live で本番反映`,
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
      name: z.string().optional().describe("ページ名（タイトル）"),
      slug: z.string().optional().describe("スラグ（URLパス）"),
      state: z
        .enum(["DRAFT", "PUBLISHED", "SCHEDULED"])
        .optional()
        .describe("公開状態（DRAFT / PUBLISHED / SCHEDULED）"),
      htmlTitle: z.string().optional().describe("HTMLタイトル"),
      metaDescription: z.string().optional().describe("メタディスクリプション"),
      layoutSections: z
        .record(z.unknown())
        .optional()
        .describe(
          "drag-and-drop area のレイアウト・モジュール定義。" +
            "更新前に cms_page_list の full オプションで取得し、変更したいモジュールのみ書き換えて全体を送信すること。"
        ),
      widgets: z
        .record(z.unknown())
        .optional()
        .describe(
          "テンプレート直下のwidget定義（widgetId → widget オブジェクト）。" +
            "全体置換のため、書き換える場合は cms_page_list で取得したものを基にすること。"
        ),
      widgetContainers: z
        .record(z.unknown())
        .optional()
        .describe(
          "flex column 内のwidget container定義。" +
            "全体置換のため、書き換える場合は cms_page_list で取得したものを基にすること。"
        ),
      additionalUpdates: z
        .record(z.unknown())
        .optional()
        .describe(
          "その他の更新フィールド（archivedInDashboard, password, publishDate, language, translations 等）"
        ),
      useDraft: z
        .boolean()
        .optional()
        .describe(
          "true=draft版を更新（公開ページに影響しない）。false（デフォルト）=公開ページを直接更新。"
        ),
      pushLive: z
        .boolean()
        .optional()
        .describe(
          "useDraft=true のときのみ有効。true=draft更新後に自動で push-live を実行。デフォルト false。"
        ),
    },
    async ({
      pageType,
      pageId,
      name,
      slug,
      state,
      htmlTitle,
      metaDescription,
      layoutSections,
      widgets,
      widgetContainers,
      additionalUpdates,
      useDraft,
      pushLive,
    }) => {
      const updates: Record<string, unknown> = {};
      if (name !== undefined) updates.name = name;
      if (slug !== undefined) updates.slug = slug;
      if (state !== undefined) updates.state = state;
      if (htmlTitle !== undefined) updates.htmlTitle = htmlTitle;
      if (metaDescription !== undefined) updates.metaDescription = metaDescription;
      if (layoutSections !== undefined) updates.layoutSections = layoutSections;
      if (widgets !== undefined) updates.widgets = widgets;
      if (widgetContainers !== undefined) updates.widgetContainers = widgetContainers;
      if (additionalUpdates) Object.assign(updates, additionalUpdates);

      try {
        const result = useDraft
          ? await updateCmsPageDraft(pageType, pageId, updates)
          : await updateCmsPage(pageType, pageId, updates);

        let pushLiveResult: unknown = null;
        if (useDraft && pushLive) {
          pushLiveResult = await pushCmsPageDraftLive(pageType, pageId);
        }

        const summary = {
          pageId,
          pageType,
          mode: useDraft ? "draft" : "published",
          pushLiveExecuted: !!(useDraft && pushLive),
          pushLiveResponse: pushLiveResult,
          result,
        };
        return {
          content: [
            { type: "text", text: JSON.stringify(summary, null, 2) },
          ],
        };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: "text", text: `エラー: ${message}` }],
          isError: true,
        };
      }
    }
  );
}
