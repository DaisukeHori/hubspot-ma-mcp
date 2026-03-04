import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { crmGet } from "@/lib/hubspot/crm-client";
import { HubSpotError } from "@/lib/hubspot/errors";

export function registerContactGet(server: McpServer) {
  server.tool(
    "contact_get",
    "HubSpot コンタクトを ID で取得する。",
    {
      contactId: z.string().describe("コンタクト ID"),
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
