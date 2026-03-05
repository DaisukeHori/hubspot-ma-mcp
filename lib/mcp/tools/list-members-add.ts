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

export function registerListMembersAdd(server: McpServer) {
  server.tool(
    "list_members_add",
    `HubSpot リスト（セグメント）にレコードを追加する。MANUALまたはSNAPSHOTタイプのリストのみ対応。

DYNAMICリストにはメンバーを手動追加できない（フィルタ条件を変更するか、レコードのプロパティを変更してフィルタに合致させる必要がある）。

返却: 処理結果（recordIdsAdded, recordIdsAlreadyMembers等）。`,
    {
      listId: z.string().describe("ILS List ID（数値文字列）。MANUAL/SNAPSHOTタイプのリストのみ対応"),
      recordIds: z.array(z.string()).describe("追加するレコードIDの配列（コンタクトID等の数値文字列。contact_searchやcontact_createの返却値のidフィールドから取得）"),
    },
    async ({ listId, recordIds }) => {
      try {
        const result = await fetchJson<Record<string, unknown>>(
          `${BASE_URL}/crm/v3/lists/${listId}/memberships/add`,
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
