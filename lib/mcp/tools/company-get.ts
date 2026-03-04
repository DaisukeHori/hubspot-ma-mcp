import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { crmGet } from "@/lib/hubspot/crm-client";
import { HubSpotError } from "@/lib/hubspot/errors";

export function registerCompanyGet(server: McpServer) {
  server.tool(
    "company_get",
    "HubSpot 会社を ID で取得する。",
    {
      companyId: z.string().describe("会社 ID"),
      properties: z.array(z.string()).optional(),
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
