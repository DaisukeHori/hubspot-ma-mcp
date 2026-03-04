import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { crmUpdate } from "@/lib/hubspot/crm-client";
import { HubSpotError } from "@/lib/hubspot/errors";

export function registerCompanyUpdate(server: McpServer) {
  server.tool(
    "company_update",
    `HubSpot 会社のプロパティを更新する。指定したプロパティのみ上書き（未指定のプロパティは変更されない）。

プロパティ名はproperties_listツールで確認可能。列挙型プロパティ（industry等）は定義済みの値のみ設定可能。`,
    {
      companyId: z.string().describe("会社 ID"),
      properties: z.record(z.string()).describe("更新するプロパティ（キー:値）"),
    },
    async ({ companyId, properties }) => {
      try {
        const result = await crmUpdate("companies", companyId, properties);
        return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
      } catch (error) {
        const message = error instanceof HubSpotError ? `HubSpot API エラー (${error.status}): ${error.message}` : String(error);
        return { content: [{ type: "text" as const, text: message }], isError: true };
      }
    }
  );
}
