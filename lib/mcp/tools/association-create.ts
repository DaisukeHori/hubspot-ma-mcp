import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createAssociation } from "@/lib/hubspot/crm-client";
import { HubSpotError } from "@/lib/hubspot/errors";

export function registerAssociationCreate(server: McpServer) {
  server.tool(
    "association_create",
    "HubSpot レコード間の関連付けを作成する。方向性あり（from→to）。ラベル付き関連はassociationCategoryとassociationTypeIdを指定。デフォルト（ラベルなし）は省略可。方向の例: contact→company(typeId=1), company→contact(typeId=2), deal→contact(typeId=3), contact→deal(typeId=4)。カスタムラベルのtypeIdはassociation_labelsツールで取得可能。",
    {
      fromObjectType: z.string().describe("元オブジェクトタイプ（方向の起点）: contacts, companies, deals, tickets, notes, tasks 等"),
      fromObjectId: z.string().describe("元レコード ID"),
      toObjectType: z.string().describe("関連先オブジェクトタイプ（方向の終点）"),
      toObjectId: z.string().describe("関連先レコード ID"),
      associationCategory: z.enum(["HUBSPOT_DEFINED", "USER_DEFINED"]).optional().describe("関連カテゴリ: HUBSPOT_DEFINED（デフォルトラベル）/ USER_DEFINED（カスタムラベル）"),
      associationTypeId: z.number().optional().describe("関連タイプ ID。方向により異なる（例: 1=contact→company, 2=company→contact, 3=deal→contact, 4=contact→deal, 5=deal→company, 6=company→deal, 15=contact→ticket, 16=ticket→contact, 19=deal→line_item, 20=line_item→deal）"),
    },
    async ({ fromObjectType, fromObjectId, toObjectType, toObjectId, associationCategory, associationTypeId }) => {
      try {
        const result = await createAssociation(
          fromObjectType, fromObjectId, toObjectType, toObjectId,
          associationCategory, associationTypeId
        );
        return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
      } catch (error) {
        const message = error instanceof HubSpotError ? `HubSpot API エラー (${error.status}): ${error.message}` : String(error);
        return { content: [{ type: "text" as const, text: message }], isError: true };
      }
    }
  );
}
