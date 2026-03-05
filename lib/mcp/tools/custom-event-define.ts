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
  return { Authorization: `Bearer ${getHubSpotToken()}`, "Content-Type": "application/json" };
}

export function registerCustomEventDefine(server: McpServer) {
  server.tool(
    "custom_event_define",
    `HubSpot カスタムイベント定義（スキーマ）を新規作成する。「セミナー参加」「資料ダウンロード」等のビジネス固有イベントの構造を定義。

返却: fullyQualifiedName（custom_event_sendで使用するイベント名）, name, label, primaryObject, propertyDefinitions。

制限: アカウントあたり最大500イベント定義。
スコープ: behavioral_events.event_definitions.read_write`,
    {
      label: z.string().describe("イベントの表示名（例: 'セミナー参加', '資料ダウンロード'）"),
      name: z.string().describe("イベントの内部名（英数字アンダースコアのみ。例: 'seminar_attendance'）。自動的にプレフィックス付きのfullyQualifiedNameが生成される"),
      primaryObject: z.enum(["CONTACT", "COMPANY", "DEAL", "TICKET"]).describe("関連付けるオブジェクトタイプ"),
      description: z.string().optional().describe("イベントの説明"),
      includeDefaultProperties: z.boolean().optional().describe("デフォルトプロパティ（hs_city, hs_country等）を含めるか（デフォルト true）"),
      propertyDefinitions: z.array(z.object({
        name: z.string().describe("プロパティ内部名（英数字アンダースコア小文字のみ）"),
        label: z.string().describe("プロパティ表示名"),
        type: z.string().describe("型: string, number, enumeration, datetime"),
        description: z.string().optional().describe("プロパティの説明"),
        options: z.array(z.object({
          label: z.string().describe("選択肢の表示名"),
          value: z.string().describe("選択肢の内部値"),
        })).optional().describe("enumeration型の選択肢"),
      })).optional().describe("カスタムプロパティ定義の配列。イベント固有のデータ項目（例: セミナー名、参加方法等）"),
    },
    async ({ label, name, primaryObject, description, includeDefaultProperties, propertyDefinitions }) => {
      try {
        const body: Record<string, unknown> = { label, name, primaryObject };
        if (description) body.description = description;
        if (includeDefaultProperties !== undefined) body.includeDefaultProperties = includeDefaultProperties;
        if (propertyDefinitions) body.propertyDefinitions = propertyDefinitions;

        const result = await fetchJson<Record<string, unknown>>(
          `${BASE_URL}/events/v3/event-definitions`,
          { method: "POST", headers: getHeaders(), body: JSON.stringify(body) }
        );
        return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
      } catch (error) {
        const message = error instanceof HubSpotError ? `HubSpot API エラー (${error.status}): ${error.message}` : String(error);
        return { content: [{ type: "text" as const, text: message }], isError: true };
      }
    }
  );
}
