import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { crmDelete } from "@/lib/hubspot/crm-client";

export function registerMeetingDelete(server: McpServer) {
  server.tool(
  "meeting_delete",
  `指定IDのミーティングエンゲージメントを削除する（ゴミ箱へ移動）。
公式仕様 (developers.hubspot.com): "Delete meetings... will add the meeting to the recycling bin in HubSpot.
You can later restore the meeting from the record timeline."
すなわち、API経由で削除されたミーティングは関連レコード（コンタクト・会社・取引等）の
タイムラインから「復元」できる。一般CRMオブジェクト同様、90日以内なら復元可能。
注意: email_delete とは異なる挙動（email は永久削除）。
confirm=true が必須（false/省略時は実行されない）。
公式: DELETE /crm/v3/objects/meetings/{meetingId}`,
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
