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

export function registerListGet(server: McpServer) {
  server.tool(
    "list_get",
    `HubSpot リスト（セグメント）の詳細を1件取得する。ILS List IDで指定。

返却: listId, name, objectTypeId, processingType, processingStatus, filterBranch（DYNAMICリストのフィルタ定義）。
includeFilters=trueでフィルタ定義の詳細も返る。`,
    {
      listId: z.string().describe("ILS List ID（数値文字列）。list_searchまたはlist_createの返却値から取得"),
      includeFilters: z.boolean().optional().describe("フィルタ定義を含めるか（デフォルト false。DYNAMICリストの条件確認時にtrue指定）"),
    },
    async ({ listId, includeFilters }) => {
      try {
        const params = new URLSearchParams();
        if (includeFilters) params.set("includeFilters", "true");
        const qs = params.toString() ? `?${params.toString()}` : "";

        const result = await fetchJson<Record<string, unknown>>(
          `${BASE_URL}/crm/v3/lists/${listId}${qs}`,
          { method: "GET", headers: getHeaders() }
        );
        return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
      } catch (error) {
        const message = error instanceof HubSpotError ? `HubSpot API エラー (${error.status}): ${error.message}` : String(error);
        return { content: [{ type: "text" as const, text: message }], isError: true };
      }
    }
  );
}
