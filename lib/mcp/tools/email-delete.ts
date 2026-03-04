import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { crmDelete } from "@/lib/hubspot/crm-client";

export function registerEmailDelete(server: McpServer) {
  server.tool(
  "email_delete",
  "指定IDのメールエンゲージメントを永久削除する。削除後は復元不可（他のエンゲージメントと異なりゴミ箱に入らない）。confirm=trueが必須。",
  {
    emailId: z.string().describe("メールのエンゲージメントID（数値文字列）。email_searchの返却値のidフィールドから取得"),
    confirm: z.boolean().describe("削除確認フラグ（trueを指定して実行。この操作は取消不可）"),
  },
  async ({ emailId, confirm }) => {
    if (!confirm) return { content: [{ type: "text" as const, text: "confirm=trueを指定してください。メール削除は永久削除であり復元できません。" }] };
    await crmDelete("emails", emailId);
    return {
      content: [{ type: "text" as const, text: JSON.stringify({ deleted: true, id: emailId, permanent: true }) }],
    };
  }
);
}
