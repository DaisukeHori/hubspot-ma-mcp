import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { crmGet } from "@/lib/hubspot/crm-client";
import { formatToolResult, prettyParam } from "@/lib/mcp/utils/format-result";

export function registerEmailGet(server: McpServer) {
  server.tool(
  "email_get",
  "指定IDのメールエンゲージメント詳細を取得する。返却値: id, properties（hs_email_subject, hs_email_text, hs_email_status, hs_email_direction等）, createdAt, updatedAt, associations。",
  {
    emailId: z.string().describe("メールのエンゲージメントID（数値文字列）。email_searchの返却値のidフィールドから取得"),
    properties: z.array(z.string()).optional().describe("取得するプロパティ名の配列。省略時はデフォルトプロパティのみ"),
    associations: z.array(z.string()).optional().describe("取得する関連オブジェクト（例: ['contacts','companies','deals']）"),
  
      pretty: prettyParam,
},
  async ({ emailId, properties, associations, pretty }) => {
    const result = await crmGet("emails", emailId, properties, associations);
    return {
      content: [{ type: "text" as const, text: formatToolResult(result, pretty) }],
    };
  }
);
}
