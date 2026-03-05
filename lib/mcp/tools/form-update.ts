import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getHubSpotToken } from "@/lib/hubspot/auth-context";
import { HubSpotError } from "@/lib/hubspot/errors";

const BASE_URL = "https://api.hubapi.com";

async function fetchJson<T>(url: string, options: RequestInit): Promise<T> {
  const response = await fetch(url, options);
  if (!response.ok) {
    let message = response.statusText;
    try { const body = await response.json(); message = body.message || JSON.stringify(body); } catch { /* ignore */ }
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
返却: 更新後のフォーム完全定義。`,
    {
      formId: z.string().describe("フォームID（UUID形式）。form_listの返却値のidフィールドから取得"),
      name: z.string().describe("フォーム名"),
      formType: z.enum(["hubspot", "captured", "flow", "blog_comment"]).describe("フォームタイプ"),
      fieldGroups: z.array(z.object({
        groupType: z.string().optional().describe("グループタイプ"),
        richTextType: z.string().optional().describe("リッチテキストタイプ"),
        richText: z.string().optional().describe("リッチテキスト（HTML）"),
        fields: z.array(z.object({
          objectTypeId: z.string().describe("オブジェクトタイプID（0-1=コンタクト等）"),
          name: z.string().describe("プロパティ内部名"),
          label: z.string().describe("表示ラベル"),
          fieldType: z.string().describe("入力タイプ"),
          required: z.boolean().describe("必須かどうか"),
          hidden: z.boolean().optional().describe("非表示かどうか"),
          placeholder: z.string().optional().describe("プレースホルダー"),
          description: z.string().optional().describe("ヘルプテキスト"),
          defaultValue: z.string().optional().describe("デフォルト値"),
        })).describe("フィールド定義の配列"),
      })).describe("フィールドグループの配列（PUT=全体置換。既存フィールドも全て含めること）"),
      configuration: z.record(z.unknown()).optional().describe("フォーム設定（language, postSubmitAction, lifecycleStages等）"),
    },
    async ({ formId, name, formType, fieldGroups, configuration }) => {
      try {
        const body: Record<string, unknown> = { name, formType, fieldGroups };
        if (configuration) body.configuration = configuration;

        const result = await fetchJson<Record<string, unknown>>(
          `${BASE_URL}/marketing/v3/forms/${formId}`,
          {
            method: "PUT",
            headers: getHeaders(),
            body: JSON.stringify(body),
          }
        );

        return {
          content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        const message = error instanceof HubSpotError
          ? `HubSpot API エラー (${error.status}): ${error.message}`
          : String(error);
        return { content: [{ type: "text" as const, text: message }], isError: true };
      }
    }
  );
}
