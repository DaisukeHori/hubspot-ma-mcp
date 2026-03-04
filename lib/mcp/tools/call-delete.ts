import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { crmDelete } from "@/lib/hubspot/crm-client";

export function registerCallDelete(server: McpServer) {
  server.tool(
  "call_delete",
  "指定IDの通話エンゲージメントを削除する（ゴミ箱へ移動）。レコードのタイムラインから復元可能。confirm=trueが必須。",
  {
    callId: z.string().describe("通話のエンゲージメントID（数値文字列）。call_searchの返却値のidフィールドから取得"),
    confirm: z.boolean().describe("削除確認フラグ（trueを指定して実行。誤削除防止）"),
  },
  async ({ callId, confirm }) => {
    if (!confirm) return { content: [{ type: "text" as const, text: "confirm=trueを指定してください" }] };
    await crmDelete("calls", callId);
    return {
      content: [{ type: "text" as const, text: JSON.stringify({ deleted: true, id: callId }) }],
    };
  }
);
}
