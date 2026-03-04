import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { crmUpdate } from "@/lib/hubspot/crm-client";

export function registerEmailUpdate(server: McpServer) {
  server.tool(
  "email_update",
  "指定IDのメールエンゲージメントを部分更新する。指定したプロパティのみ更新。返却値: id, properties, updatedAt。",
  {
    emailId: z.string().describe("メールのエンゲージメントID（数値文字列）。email_searchの返却値のidフィールドから取得"),
    properties: z.record(z.string()).describe("更新するプロパティ（キー:値）。省略したプロパティは変更されない"),
  },
  async ({ emailId, properties }) => {
    const result = await crmUpdate("emails", emailId, properties);
    return {
      content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
    };
  }
);
}
