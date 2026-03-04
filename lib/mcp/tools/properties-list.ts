import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { listProperties } from "@/lib/hubspot/crm-client";
import { HubSpotError } from "@/lib/hubspot/errors";

export function registerPropertiesList(server: McpServer) {
  server.tool(
    "properties_list",
    "HubSpot オブジェクトのプロパティ定義一覧を取得する。カスタムプロパティも含む。",
    {
      objectType: z.enum(["contacts", "companies", "deals", "tickets"]).describe("オブジェクトタイプ: contacts, companies, deals, tickets のいずれか"),
    },
    async ({ objectType }) => {
      try {
        const result = await listProperties(objectType);
        const summary = result.map((p) => ({
          name: p.name,
          label: p.label,
          type: p.type,
          fieldType: p.fieldType,
          groupName: p.groupName,
          description: p.description || undefined,
          options: p.options?.length ? p.options : undefined,
        }));
        return { content: [{ type: "text" as const, text: JSON.stringify({ total: summary.length, properties: summary }, null, 2) }] };
      } catch (error) {
        const message = error instanceof HubSpotError ? `HubSpot API エラー (${error.status}): ${error.message}` : String(error);
        return { content: [{ type: "text" as const, text: message }], isError: true };
      }
    }
  );
}
