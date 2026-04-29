import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getHubSpotToken } from "@/lib/hubspot/auth-context";
import { HubSpotError } from "@/lib/hubspot/errors";
import { formatToolResult, prettyParam } from "@/lib/mcp/utils/format-result";

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

export function registerListCreate(server: McpServer) {
  server.tool(
    "list_create",
    `HubSpot にリスト（セグメント）を新規作成する。コンタクト・会社・取引等のレコードをグループ化するために使用。

返却: 作成されたリストのlistId（ILS ID）、name、processingType、objectTypeId。

用途: セミナー参加者リスト、メール配信対象リスト、キャンペーン対象セグメント等。
MANUALリストは手動でメンバー追加/削除可能（list_members_add/remove使用）。
DYNAMICリストはフィルタ条件に基づき自動更新される。`,
    {
      name: z.string().describe("リスト名（アカウント内で一意。例: 'セミナー申込者 2026年4月'）"),
      objectTypeId: z.string().describe("対象オブジェクトタイプID。0-1=コンタクト, 0-2=会社, 0-3=取引, 0-5=チケット"),
      processingType: z.enum(["MANUAL", "DYNAMIC", "SNAPSHOT"]).describe("処理タイプ。MANUAL=手動管理（メンバーをAPIで追加/削除）, DYNAMIC=フィルタ条件で自動更新, SNAPSHOT=作成時のフィルタ結果を固定"),
      filterBranch: z.record(z.unknown()).optional().describe("DYNAMIC/SNAPSHOT用フィルタ定義（JSON）。filterBranchType（OR/AND）とfilters配列を含むツリー構造。list_getで既存リストのフィルタ構造を参照可能"),
    
      pretty: prettyParam,
},
    async ({ name, objectTypeId, processingType, filterBranch, pretty }) => {
      try {
        const body: Record<string, unknown> = { name, objectTypeId, processingType };
        if (filterBranch) body.filterBranch = filterBranch;

        const result = await fetchJson<Record<string, unknown>>(
          `${BASE_URL}/crm/v3/lists`,
          { method: "POST", headers: getHeaders(), body: JSON.stringify(body) }
        );
        return { content: [{ type: "text" as const, text: formatToolResult(result, pretty) }] };
      } catch (error) {
        const message = error instanceof HubSpotError ? `HubSpot API エラー (${error.status}): ${error.message}` : String(error);
        return { content: [{ type: "text" as const, text: message }], isError: true };
      }
    }
  );
}
