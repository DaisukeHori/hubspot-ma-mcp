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
    throw new HubSpotError(message, response.status);
  }
  return response.json() as Promise<T>;
}

function getHeaders(): Record<string, string> {
  return { Authorization: `Bearer ${getHubSpotToken()}`, "Content-Type": "application/json" };
}

export function registerListSearch(server: McpServer) {
  server.tool(
    "list_search",
    `HubSpot リスト（セグメント）を検索する。名前・処理タイプ・オブジェクトタイプで絞り込み可能。

返却: マッチしたリストの配列（listId, name, processingType, objectTypeId, processingStatus, additionalProperties）。
additionalPropertiesにhs_list_size（メンバー数）等が含まれる。`,
    {
      query: z.string().optional().describe("リスト名のキーワード検索（部分一致）"),
      processingTypes: z.array(z.enum(["MANUAL", "DYNAMIC", "SNAPSHOT"])).optional().describe("処理タイプでフィルタ（複数指定可）"),
      objectTypeId: z.string().optional().describe("オブジェクトタイプでフィルタ。0-1=コンタクト, 0-2=会社, 0-3=取引"),
      offset: z.number().optional().describe("ページネーション用オフセット"),
    },
    async ({ query, processingTypes, objectTypeId, offset }) => {
      try {
        const body: Record<string, unknown> = {};
        if (query) body.query = query;
        if (processingTypes) body.processingTypes = processingTypes;
        if (objectTypeId) body.objectTypeId = objectTypeId;
        if (offset !== undefined) body.offset = offset;

        const result = await fetchJson<Record<string, unknown>>(
          `${BASE_URL}/crm/v3/lists/search`,
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
