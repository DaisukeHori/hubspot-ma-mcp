import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { listAssociations } from "@/lib/hubspot/crm-client";
import { HubSpotError } from "@/lib/hubspot/errors";

export function registerAssociationList(server: McpServer) {
  server.tool(
    "association_list",
    "HubSpot レコード間の関連付け（Association）一覧を取得する。例: コンタクトに紐づく会社一覧、取引に紐づく明細行一覧。",
    {
      fromObjectType: z.string().describe("元オブジェクトタイプ（contacts, companies, deals, tickets, notes, tasks, line_items, products）"),
      fromObjectId: z.string().describe("元レコード ID"),
      toObjectType: z.string().describe("関連先オブジェクトタイプ"),
      limit: z.number().min(1).max(500).optional().describe("取得件数（デフォルト100）"),
      after: z.string().optional().describe("ページネーション用カーソル"),
    },
    async ({ fromObjectType, fromObjectId, toObjectType, limit, after }) => {
      try {
        const result = await listAssociations(fromObjectType, fromObjectId, toObjectType, limit, after);
        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify(result, null, 2),
          }],
        };
      } catch (error) {
        const message = error instanceof HubSpotError ? `HubSpot API エラー (${error.status}): ${error.message}` : String(error);
        return { content: [{ type: "text" as const, text: message }], isError: true };
      }
    }
  );
}
