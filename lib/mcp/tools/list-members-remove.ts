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

export function registerListMembersRemove(server: McpServer) {
  server.tool(
    "list_members_remove",
    `HubSpot リスト（セグメント）からレコードを削除する。MANUALまたはSNAPSHOTタイプのリストのみ対応。

DYNAMICリストからはメンバーを手動削除できない（フィルタ条件を変更するか、レコードのプロパティを変更してフィルタに合致しなくする必要がある）。
注意: リストからの削除であり、HubSpotからのレコード削除ではない。

返却: 処理結果（recordIdsRemoved等）。`,
    {
      listId: z.string().describe("ILS List ID（数値文字列）。MANUAL/SNAPSHOTタイプのリストのみ対応"),
      recordIds: z.array(z.string()).describe("削除するレコードIDの配列（数値文字列）"),
    },
    async ({ listId, recordIds }) => {
      try {
        const result = await fetchJson<Record<string, unknown>>(
          `${BASE_URL}/crm/v3/lists/${listId}/memberships/remove`,
          { method: "PUT", headers: getHeaders(), body: JSON.stringify(recordIds) }
        );
        return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
      } catch (error) {
        const message = error instanceof HubSpotError ? `HubSpot API エラー (${error.status}): ${error.message}` : String(error);
        return { content: [{ type: "text" as const, text: message }], isError: true };
      }
    }
  );
}
