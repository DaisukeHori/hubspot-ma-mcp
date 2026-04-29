import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { crmUpdate } from "@/lib/hubspot/crm-client";
import { formatToolResult, prettyParam } from "@/lib/mcp/utils/format-result";

export function registerEmailUpdate(server: McpServer) {
  server.tool(
  "email_update",
  `指定IDのメールエンゲージメント（送受信メールの記録）を部分更新する（PATCH=指定プロパティのみ上書き）。
主要プロパティ:
- hs_email_subject（件名）, hs_email_text（本文プレーンテキスト）, hs_email_html（本文HTML）
- hs_email_status（SENT / BOUNCED など）, hs_email_direction（INCOMING_EMAIL / EMAIL）
- hs_timestamp（メールタイムスタンプ ISO 8601）, hubspot_owner_id（所有者）
- hs_email_headers（from/to/cc/bcc を含むJSON文字列）
返却: id, properties, updatedAt。
公式: PATCH /crm/v3/objects/emails/{emailId}`,
  {
    emailId: z.string().describe("メールのエンゲージメントID（数値文字列）。email_searchの返却値のidフィールドから取得"),
    properties: z.record(z.string()).describe("更新するプロパティ（キー:値）。省略したプロパティは変更されない"),
  
      pretty: prettyParam,
},
  async ({ emailId, properties, pretty }) => {
    const result = await crmUpdate("emails", emailId, properties);
    return {
      content: [{ type: "text" as const, text: formatToolResult(result, pretty) }],
    };
  }
);
}
