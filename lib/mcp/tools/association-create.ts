import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createAssociation } from "@/lib/hubspot/crm-client";
import { HubSpotError } from "@/lib/hubspot/errors";
import { formatToolResult, prettyParam } from "@/lib/mcp/utils/format-result";

export function registerAssociationCreate(server: McpServer) {
  server.tool(
    "association_create",
    `HubSpot レコード間の関連付けを作成する。方向性あり（from→to）。

【デフォルト関連（ラベルなし）】associationCategory と associationTypeId を省略すると作成される。

【ラベル付き関連】associationCategory + associationTypeId を指定。
  - HUBSPOT_DEFINED: HubSpot標準ラベル（Primary等）
  - USER_DEFINED: カスタムラベル（association_labelsツールのlistで取得可能）

【方向とtypeId】方向ごとにtypeIdが異なる:
  contact→company=1, company→contact=2
  deal→contact=3, contact→deal=4
  deal→company=5, company→deal=6
  contact→ticket=15, ticket→contact=16
  deal→line_item=19, line_item→deal=20
  カスタムラベルのtypeIdはassociation_labelsツールで取得。
  ペアラベルの場合、from→toとto→fromで異なるtypeIdが付与されている。

【複数ラベル追加】同じレコードペアに複数回呼び出すことでラベルを追加可能。`,
    {
      fromObjectType: z.string().describe("元オブジェクトタイプ（方向の起点）: contacts, companies, deals, tickets, notes, tasks, line_items, products 等"),
      fromObjectId: z.string().describe("元レコード ID"),
      toObjectType: z.string().describe("関連先オブジェクトタイプ（方向の終点）: contacts, companies, deals, tickets, notes, tasks, line_items, products, 又はカスタムオブジェクトID"),
      toObjectId: z.string().describe("関連先レコード ID"),
      associationCategory: z.enum(["HUBSPOT_DEFINED", "USER_DEFINED"]).optional().describe("関連カテゴリ。HUBSPOT_DEFINED=標準ラベル、USER_DEFINED=カスタムラベル。省略するとデフォルト（ラベルなし）関連を作成"),
      associationTypeId: z.number().optional().describe("関連タイプ ID（方向ごとに異なる）。association_labelsツールのlistで確認可能"),
    
      pretty: prettyParam,
},
    async ({ fromObjectType, fromObjectId, toObjectType, toObjectId, associationCategory, associationTypeId, pretty }) => {
      try {
        const result = await createAssociation(
          fromObjectType, fromObjectId, toObjectType, toObjectId,
          associationCategory, associationTypeId
        );
        return { content: [{ type: "text" as const, text: formatToolResult(result, pretty) }] };
      } catch (error) {
        const message = error instanceof HubSpotError ? `HubSpot API エラー (${error.status}): ${error.message}` : String(error);
        return { content: [{ type: "text" as const, text: message }], isError: true };
      }
    }
  );
}
