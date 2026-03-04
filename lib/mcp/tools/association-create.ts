import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createAssociation } from "@/lib/hubspot/crm-client";
import { HubSpotError } from "@/lib/hubspot/errors";

export function registerAssociationCreate(server: McpServer) {
  server.tool(
    "association_create",
    "HubSpot レコード間の関連付け（Association）を作成する。例: コンタクトと会社を紐付ける。デフォルト（ラベルなし）の関連はassociationTypeIdなしで作成可能。",
    {
      fromObjectType: z.string().describe("元オブジェクトタイプ（contacts, companies, deals, tickets, notes, tasks 等）"),
      fromObjectId: z.string().describe("元レコード ID"),
      toObjectType: z.string().describe("関連先オブジェクトタイプ"),
      toObjectId: z.string().describe("関連先レコード ID"),
      associationTypeId: z.number().optional().describe("関連タイプ ID（省略時はデフォルト関連を使用）。例: 1=contact_to_company, 3=deal_to_contact, 5=deal_to_company, 20=line_item_to_deal"),
    },
    async ({ fromObjectType, fromObjectId, toObjectType, toObjectId, associationTypeId }) => {
      try {
        const result = await createAssociation(fromObjectType, fromObjectId, toObjectType, toObjectId, associationTypeId);
        return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
      } catch (error) {
        const message = error instanceof HubSpotError ? `HubSpot API エラー (${error.status}): ${error.message}` : String(error);
        return { content: [{ type: "text" as const, text: message }], isError: true };
      }
    }
  );
}
