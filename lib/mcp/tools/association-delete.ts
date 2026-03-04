import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { deleteAssociation } from "@/lib/hubspot/crm-client";
import { HubSpotError } from "@/lib/hubspot/errors";

export function registerAssociationDelete(server: McpServer) {
  server.tool(
    "association_delete",
    "HubSpot レコード間の関連付け（Association）を削除する。",
    {
      fromObjectType: z.string().describe("元オブジェクトタイプ"),
      fromObjectId: z.string().describe("元レコード ID"),
      toObjectType: z.string().describe("関連先オブジェクトタイプ"),
      toObjectId: z.string().describe("関連先レコード ID"),
    },
    async ({ fromObjectType, fromObjectId, toObjectType, toObjectId }) => {
      try {
        await deleteAssociation(fromObjectType, fromObjectId, toObjectType, toObjectId);
        return { content: [{ type: "text" as const, text: `関連付けを削除しました: ${fromObjectType}/${fromObjectId} → ${toObjectType}/${toObjectId}` }] };
      } catch (error) {
        const message = error instanceof HubSpotError ? `HubSpot API エラー (${error.status}): ${error.message}` : String(error);
        return { content: [{ type: "text" as const, text: message }], isError: true };
      }
    }
  );
}
