/**
 * form_patch ツール
 * HubSpot フォームの定義を「部分更新」する（PATCH /marketing/v3/forms/{formId}）。
 *
 * 既存の form_update（PUT＝全体置換）と違い、リクエストボディに含めたフィールドだけが
 * 上書きされる。configuration の中の notifyRecipients / createNewContactForNewEmail だけを
 * 変更したい、といった「部分更新」用途のために追加された。
 *
 * 公式仕様:
 *   PATCH /marketing/v3/forms/{formId}
 *   "Partially update a form definition"
 *   "Update some of the form definition components"
 *   https://developers.hubspot.com/docs/api-reference/marketing-forms-v3/forms/patch-marketing-v3-forms-formId
 *
 * 設計上の決定:
 *   - formId 以外は全て optional。undefined のフィールドはリクエストボディに含めない。
 *     これにより「configuration だけ送る」「name だけ変える」といった最小ボディが成立する。
 *   - fieldGroups を省略した場合、HubSpot 側の既存フィールド構成は保持される（PATCH の挙動）。
 *   - form_update（PUT）で問題になっていた field レベルの id/createdAt 自動補完は不要になる
 *     （fieldGroups を送らなければ field の中身を組み立てる必要がそもそも無いため）。
 *   - PATCH の公式 curl 例には updatedAt が含まれていないため、こちらでは自動補完しない。
 *     もし HubSpot 側が要求してきたら別途対応する。
 *
 * Zod スキーマは form-create / form-update と同じ共通スキーマ（_form-schemas.ts）を参照する。
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getHubSpotToken } from "@/lib/hubspot/auth-context";
import { HubSpotError } from "@/lib/hubspot/errors";
import { formatToolResult, prettyParam } from "@/lib/mcp/utils/format-result";
import {
  FieldGroupSchema,
  ConfigurationSchema,
  DisplayOptionsSchema,
  LegalConsentOptionsSchema,
} from "./_form-schemas";

const BASE_URL = "https://api.hubapi.com";

async function fetchJson<T>(url: string, options: RequestInit): Promise<T> {
  const response = await fetch(url, options);
  if (!response.ok) {
    let message = response.statusText;
    try {
      const body = await response.json();
      message = body.message || JSON.stringify(body);
    } catch {
      /* ignore */
    }
    throw new HubSpotError(response.status, message);
  }
  return response.json() as Promise<T>;
}

function getHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${getHubSpotToken()}`,
    "Content-Type": "application/json",
  };
}

export function registerFormPatch(server: McpServer) {
  server.tool(
    "form_patch",
    `HubSpot フォームの定義を**部分更新**する（PATCH /marketing/v3/forms/{formId}）。

form_update（PUT＝全体置換）と違い、リクエストボディに含めたフィールドだけが上書きされる。
省略したフィールドグループや設定は既存値が保持される。

主なユースケース:
- configuration の notifyRecipients（通知先メール）や createNewContactForNewEmail だけを変更したい
- name だけ変更したい
- archived を切り替えたい
- displayOptions のみ変更したい

部分更新のため、form_update のように form_get で全体を取得して送り直す必要が無い。
fieldGroups を省略すれば既存のフィールド構成は保持される。

返却: 更新後のフォーム完全定義。`,
    {
      formId: z
        .string()
        .describe(
          "フォームID（UUID形式）。form_listの返却値のidフィールドから取得。"
        ),
      name: z.string().optional().describe("フォーム名（変更したい場合のみ指定）"),
      formType: z
        .enum(["hubspot", "captured", "flow", "blog_comment"])
        .optional()
        .describe(
          "フォームタイプ（変更したい場合のみ指定）: " +
            "hubspot=通常のマーケティングフォーム / " +
            "captured=外部HTMLフォーム / " +
            "flow=ポップアップフォーム / " +
            "blog_comment=ブログコメントフォーム"
        ),
      fieldGroups: z
        .array(FieldGroupSchema)
        .optional()
        .describe(
          "フィールドグループの配列（**省略時は既存フィールド構成を保持**）。" +
            "指定する場合は全体置換に近い挙動になる点に注意。" +
            "configuration や notifyRecipients だけを更新したいときは省略すること。"
        ),
      configuration: ConfigurationSchema.optional().describe(
        "フォームの設定（言語、送信後アクション、ライフサイクルステージ、通知先 notifyRecipients、" +
          "createNewContactForNewEmail 等）。**部分更新したい場合はここだけ指定すれば足りる**。"
      ),
      displayOptions: DisplayOptionsSchema.optional().describe(
        "フォームの表示オプション（テーマ・ボタンテキスト・CSSスタイル設定）"
      ),
      legalConsentOptions: LegalConsentOptionsSchema.optional().describe(
        "法的同意オプション（GDPR対応。type=none で同意不要）"
      ),
      archived: z
        .boolean()
        .optional()
        .describe(
          "アーカイブ状態。true でアーカイブ、false でアクティブに戻す。" +
            "form_delete とは別経路でのアーカイブ切替に使う。"
        ),
      pretty: prettyParam,
    },
    async ({
      formId,
      name,
      formType,
      fieldGroups,
      configuration,
      displayOptions,
      legalConsentOptions,
      archived,
      pretty,
    }) => {
      try {
        // PATCH: undefined のフィールドはリクエストボディに含めない
        const body: Record<string, unknown> = {};
        if (name !== undefined) body.name = name;
        if (formType !== undefined) body.formType = formType;
        if (fieldGroups !== undefined) body.fieldGroups = fieldGroups;
        if (configuration !== undefined) body.configuration = configuration;
        if (displayOptions !== undefined) body.displayOptions = displayOptions;
        if (legalConsentOptions !== undefined)
          body.legalConsentOptions = legalConsentOptions;
        if (archived !== undefined) body.archived = archived;

        // formId 以外何も指定されていない場合は早期エラー（API を無駄打ちしない）
        if (Object.keys(body).length === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text:
                  "form_patch には formId 以外に少なくとも 1 つの更新対象フィールド" +
                  "（name / formType / fieldGroups / configuration / displayOptions / " +
                  "legalConsentOptions / archived のいずれか）を指定してください。",
              },
            ],
            isError: true,
          };
        }

        const result = await fetchJson<Record<string, unknown>>(
          `${BASE_URL}/marketing/v3/forms/${formId}`,
          {
            method: "PATCH",
            headers: getHeaders(),
            body: JSON.stringify(body),
          }
        );

        return {
          content: [
            { type: "text" as const, text: formatToolResult(result, pretty) },
          ],
        };
      } catch (error) {
        const message =
          error instanceof HubSpotError
            ? `HubSpot API エラー (${error.status}): ${error.message}`
            : String(error);
        return {
          content: [{ type: "text" as const, text: message }],
          isError: true,
        };
      }
    }
  );
}
