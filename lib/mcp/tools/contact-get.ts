import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { crmGet } from "@/lib/hubspot/crm-client";
import { HubSpotError } from "@/lib/hubspot/errors";

export function registerContactGet(server: McpServer) {
  server.tool(
    "contact_get",
    `HubSpot コンタクトを1件取得する。IDを指定してプロパティと関連オブジェクトを取得。

返却: コンタクトのID, 全プロパティ（またはproperties指定分）, 作成日, 更新日, アーカイブ状態。
associations指定時は関連オブジェクトのID一覧も返る。`,
    {
      contactId: z.string().describe("コンタクトレコードID（数値文字列）。contact_searchやcontact_createの返却値のidフィールドから取得"),
      properties: z.array(z.string()).optional().describe("取得するプロパティ名の配列"),
      associations: z.array(z.string()).optional().describe("関連オブジェクト（companies, deals, tickets）"),
    },
    async ({ contactId, properties, associations }) => {
      try {
        const defaultProps = properties ?? [
          "email", "firstname", "lastname", "company", "phone", "jobtitle",
          "lifecyclestage", "hs_lead_status", "city", "state", "country",
          "createdate", "lastmodifieddate",
        ];
        const result = await crmGet("contacts", contactId, defaultProps, associations);
        return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
      } catch (error) {
        const message = error instanceof HubSpotError ? `HubSpot API エラー (${error.status}): ${error.message}` : String(error);
        return { content: [{ type: "text" as const, text: message }], isError: true };
      }
    }
  );
}
