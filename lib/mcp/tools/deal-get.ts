import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { crmGet } from "@/lib/hubspot/crm-client";
import { HubSpotError } from "@/lib/hubspot/errors";
import { formatToolResult, prettyParam } from "@/lib/mcp/utils/format-result";

export function registerDealGet(server: McpServer) {
  server.tool(
    "deal_get",
    `HubSpot 取引を1件取得する。IDを指定してプロパティと関連オブジェクトを取得。

返却: 取引のID, 全プロパティ（またはproperties指定分）, 作成日, 更新日。
associations指定時は関連するcontacts/companiesのID一覧も返る。`,
    {
      dealId: z.string().describe("取引レコードID（数値文字列）。deal_searchやdeal_createの返却値のidフィールドから取得"),
      properties: z.array(z.string()).optional().describe("取得するプロパティ名の配列（例: ['dealname','amount','dealstage','pipeline','closedate']）。省略時はデフォルトプロパティのみ"),
      associations: z.array(z.string()).optional().describe("関連オブジェクト（contacts, companies）"),
    
      pretty: prettyParam,
},
    async ({ dealId, properties, associations, pretty }) => {
      try {
        const defaultProps = properties ?? [
          "dealname", "amount", "dealstage", "pipeline", "closedate",
          "hubspot_owner_id", "description", "createdate", "lastmodifieddate",
        ];
        const result = await crmGet("deals", dealId, defaultProps, associations);
        return { content: [{ type: "text" as const, text: formatToolResult(result, pretty) }] };
      } catch (error) {
        const message = error instanceof HubSpotError ? `HubSpot API エラー (${error.status}): ${error.message}` : String(error);
        return { content: [{ type: "text" as const, text: message }], isError: true };
      }
    }
  );
}
