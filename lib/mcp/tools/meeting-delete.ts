import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { crmDelete } from "@/lib/hubspot/crm-client";

export function registerMeetingDelete(server: McpServer) {
  server.tool(
  "meeting_delete",
  "指定IDのミーティングエンゲージメントをアーカイブ（論理削除）する。アーカイブ後はsearch結果に表示されなくなる。",
  {
    meetingId: z.string().describe("ミーティングのエンゲージメントID（数値文字列）。meeting_searchの返却値のidフィールドから取得"),
    confirm: z.boolean().describe("削除確認フラグ（trueを指定して実行。誤削除防止）"),
  },
  async ({ meetingId, confirm }) => {
    if (!confirm) return { content: [{ type: "text" as const, text: "confirm=trueを指定してください" }] };
    await crmDelete("meetings", meetingId);
    return {
      content: [{ type: "text" as const, text: JSON.stringify({ deleted: true, id: meetingId }) }],
    };
  }
);
}
