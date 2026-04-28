import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { crmDelete } from "@/lib/hubspot/crm-client";

export function registerEmailDelete(server: McpServer) {
  server.tool(
  "email_delete",
  `⚠️ 指定IDのメールエンゲージメントを完全削除する。
公式仕様 (developers.hubspot.com): "When you delete an email, it is permanently deleted and cannot be restored."
すなわち、API経由でのメール削除は他のCRMオブジェクト（contact / company / deal 等の90日復元可）と異なり、
ゴミ箱（recycle bin）に入らず即時かつ完全に削除される。HubSpotサポートに問い合わせても復元できない。
削除前に email_get で内容確認を強く推奨。
confirm=true が必須（false/省略時は実行されない）。
公式: DELETE /crm/v3/objects/emails/{emailId}`,
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
