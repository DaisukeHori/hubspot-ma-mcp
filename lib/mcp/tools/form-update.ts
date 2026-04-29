/**
 * form_update ツール
 * HubSpot フォームの定義を全体置換で更新する（PUT /marketing/v3/forms/{formId}）。
 *
 * Zod スキーマは form-create と完全に同じ共通スキーマ（_form-schemas.ts）を参照する。
 * 2026-04-28 に form-create と同等に完全書き直し。
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

export function registerFormUpdate(server: McpServer) {
  server.tool(
    "form_update",
    `HubSpot フォームの定義を全体置換で更新する（PUT）。フィールド構成・設定・表示オプション等を変更可能。

注意: このAPIはPUT（全体置換）のため、省略したフィールドグループは削除される。更新前にform_getで現在の定義を取得し、変更箇所のみ修正して全体を送信すること。

スキーマは form_create と完全に同じ。validation/options/notifyRecipients/embedType/postSubmitAction.type="redirect_url" 等を全てサポート。

返却: 更新後のフォーム完全定義。`,
    {
      formId: z
        .string()
        .describe(
          "フォームID（UUID形式）。form_listの返却値のidフィールドから取得"
        ),
      name: z.string().describe("フォーム名"),
      formType: z
        .enum(["hubspot", "captured", "flow", "blog_comment"])
        .describe(
          "フォームタイプ（4値）: " +
            "hubspot=通常のマーケティングフォーム / " +
            "captured=外部HTMLフォーム（HubSpot外で作成され追跡対象として登録されたもの） / " +
            "flow=ポップアップフォーム / " +
            "blog_comment=ブログコメントフォーム"
        ),
      fieldGroups: z
        .array(FieldGroupSchema)
        .describe(
          "フィールドグループの配列（PUT=全体置換。既存フィールドも全て含めること）"
        ),
      configuration: ConfigurationSchema.optional().describe(
        "フォームの設定（言語、送信後アクション、ライフサイクルステージ、通知先等）"
      ),
      displayOptions: DisplayOptionsSchema.optional().describe(
        "フォームの表示オプション（テーマ・ボタンテキスト・CSSスタイル設定）。form_getで取得した値を参照"
      ),
      legalConsentOptions: LegalConsentOptionsSchema.optional().describe(
        "法的同意オプション（GDPR対応。type=none で同意不要）"
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
      legalConsentOptions, pretty,
    }) => {
      try {
        // form-create と同じく、HubSpot Forms v3 API は updatedAt を要求する。
        // PUT (全体置換) のため、現在時刻で更新する。
        const now = new Date().toISOString();
        const body: Record<string, unknown> = {
          name,
          formType,
          fieldGroups,
          updatedAt: now,
        };
        if (configuration) body.configuration = configuration;
        if (displayOptions) body.displayOptions = displayOptions;
        if (legalConsentOptions) body.legalConsentOptions = legalConsentOptions;

        const result = await fetchJson<Record<string, unknown>>(
          `${BASE_URL}/marketing/v3/forms/${formId}`,
          {
            method: "PUT",
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
