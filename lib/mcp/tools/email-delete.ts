import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { crmDelete } from "@/lib/hubspot/crm-client";

export function registerEmailDelete(server: McpServer) {
  server.tool(
  "email_delete",
  "指定IDのメールエンゲージメントをアーカイブ（論理削除）する。アーカイブ後はsearch結果に表示されなくなる。",
  {
    emailId: z.string().describe("メールのエンゲージメントID（数値文字列）。email_searchの返却値のidフィールドから取得"),
    confirm: z.boolean().describe("削除確認フラグ（trueを指定して実行。誤削除防止）"),
  },
  async ({ emailId, confirm }) => {
    if (!confirm) return { content: [{ type: "text" as const, text: "confirm=trueを指定してください" }] };
    await crmDelete("emails", emailId);
    return {
      content: [{ type: "text" as const, text: JSON.stringify({ deleted: true, id: emailId }) }],
    };
  }
);
}
