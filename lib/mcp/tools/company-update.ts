import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { crmUpdate } from "@/lib/hubspot/crm-client";
import { HubSpotError } from "@/lib/hubspot/errors";
import { formatToolResult, prettyParam } from "@/lib/mcp/utils/format-result";

export function registerCompanyUpdate(server: McpServer) {
  server.tool(
    "company_update",
    `HubSpot 会社のプロパティを更新する。指定したプロパティのみ上書き（未指定のプロパティは変更されない）。

プロパティ名はproperties_listツールで確認可能。列挙型プロパティ（industry等）は定義済みの値のみ設定可能。`,
    {
      companyId: z.string().describe("会社レコードID（数値文字列）。company_searchやcompany_createの返却値のidフィールドから取得"),
      properties: z.record(z.string()).describe("更新するプロパティ（キー:値）"),
    
      pretty: prettyParam,
},
    async ({ companyId, properties, pretty }) => {
      try {
        const result = await crmUpdate("companies", companyId, properties);
        return { content: [{ type: "text" as const, text: formatToolResult(result, pretty) }] };
      } catch (error) {
        const message = error instanceof HubSpotError ? `HubSpot API エラー (${error.status}): ${error.message}` : String(error);
        return { content: [{ type: "text" as const, text: message }], isError: true };
      }
    }
  );
}
