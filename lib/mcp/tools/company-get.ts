import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { crmGet } from "@/lib/hubspot/crm-client";
import { HubSpotError } from "@/lib/hubspot/errors";

export function registerCompanyGet(server: McpServer) {
  server.tool(
    "company_get",
    `HubSpot 会社を1件取得する。IDを指定してプロパティと関連オブジェクトを取得。

返却: 会社のID, 全プロパティ（またはproperties指定分）, 作成日, 更新日。
associations指定時は関連するcontacts/dealsのID一覧も返る。`,
    {
      companyId: z.string().describe("会社 ID"),
      properties: z.array(z.string()).optional().describe("取得するプロパティ名の配列（例: ['name','domain','industry','phone']）。省略時はデフォルトプロパティのみ"),
      associations: z.array(z.string()).optional().describe("関連オブジェクト（contacts, deals）"),
    },
    async ({ companyId, properties, associations }) => {
      try {
        const defaultProps = properties ?? [
          "name", "domain", "industry", "phone", "city", "state", "country",
          "numberofemployees", "annualrevenue", "description", "lifecyclestage",
          "createdate", "lastmodifieddate",
        ];
        const result = await crmGet("companies", companyId, defaultProps, associations);
        return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
      } catch (error) {
        const message = error instanceof HubSpotError ? `HubSpot API エラー (${error.status}): ${error.message}` : String(error);
        return { content: [{ type: "text" as const, text: message }], isError: true };
      }
    }
  );
}
