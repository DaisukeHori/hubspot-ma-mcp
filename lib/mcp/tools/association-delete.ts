import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { deleteAssociation, removeAssociationLabels } from "@/lib/hubspot/crm-client";
import { HubSpotError } from "@/lib/hubspot/errors";
import { formatToolResult, prettyParam } from "@/lib/mcp/utils/format-result";

export function registerAssociationDelete(server: McpServer) {
  server.tool(
    "association_delete",
    `HubSpot レコード間の関連付けを削除する。2つのモードあり:

【全削除】labelsToRemove を省略 → 2レコード間の全関連（全ラベル含む）を完全削除。
【特定ラベルのみ解除】labelsToRemove を指定 → 指定したラベルだけを外す。デフォルト（ラベルなし）関連は残る。
  ⚠ デフォルト（unlabeled）関連を削除すると、他の全ラベルも一緒に消える。`,
    {
      fromObjectType: z.string().describe("元オブジェクトタイプ（方向の起点）: contacts, companies, deals, tickets, notes, tasks, line_items, products, 又はカスタムオブジェクトID"),
      fromObjectId: z.string().describe("元レコード ID"),
      toObjectType: z.string().describe("関連先オブジェクトタイプ: contacts, companies, deals, tickets, notes, tasks, line_items, products, 又はカスタムオブジェクトID"),
      toObjectId: z.string().describe("関連先レコード ID"),
      labelsToRemove: z.array(z.object({
        associationCategory: z.enum(["HUBSPOT_DEFINED", "USER_DEFINED"]).describe("HUBSPOT_DEFINED（標準ラベル）または USER_DEFINED（カスタムラベル）"),
        associationTypeId: z.number().describe("削除するラベルのtypeId（association_labelsツールのlistで取得可能）"),
      })).optional().describe("削除するラベルの配列。省略時は全関連を削除。例: [{associationCategory:'USER_DEFINED', associationTypeId:37}]"),
    
      pretty: prettyParam,
},
    async ({ fromObjectType, fromObjectId, toObjectType, toObjectId, labelsToRemove, pretty }) => {
      try {
        if (labelsToRemove && labelsToRemove.length > 0) {
          // Remove specific labels only
          const result = await removeAssociationLabels(fromObjectType, toObjectType, fromObjectId, toObjectId, labelsToRemove);
          return { content: [{ type: "text" as const, text: formatToolResult({
            action: "特定ラベル解除",
            removedLabels: labelsToRemove,
            result,
          }, pretty) }] };
        } else {
          // Delete all associations between the two records
          await deleteAssociation(fromObjectType, fromObjectId, toObjectType, toObjectId);
          return { content: [{ type: "text" as const, text: `${fromObjectType}/${fromObjectId} ↔ ${toObjectType}/${toObjectId} の全関連を削除しました。` }] };
        }
      } catch (error) {
        const message = error instanceof HubSpotError ? `HubSpot API エラー (${error.status}): ${error.message}` : String(error);
        return { content: [{ type: "text" as const, text: message }], isError: true };
      }
    }
  );
}
