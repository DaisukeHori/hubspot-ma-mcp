import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { crmGet } from "@/lib/hubspot/crm-client";

export function registerQuoteGet(server: McpServer) {
  server.tool(
  "quote_get",
  "指定IDの見積もり（Quote）詳細を取得する。Quotes APIは読み取り専用（作成・更新・削除はHubSpot UI上のみ）。返却値: id, properties（hs_title, hs_status, hs_expiration_date, hs_public_url_key, hs_quote_amount等）, associations。",
  {
    quoteId: z.string().describe("見積もりレコードID（数値文字列）。quote_searchの返却値のidフィールドから取得"),
    properties: z.array(z.string()).optional().describe("取得するプロパティ名の配列"),
    associations: z.array(z.string()).optional().describe("取得する関連オブジェクト（例: ['contacts','companies','deals','line_items']）"),
  },
  async ({ quoteId, properties, associations }) => {
    const result = await crmGet("quotes", quoteId, properties, associations);
    return {
      content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
    };
  }
);
}
