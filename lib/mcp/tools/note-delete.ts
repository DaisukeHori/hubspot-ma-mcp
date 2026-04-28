import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { crmDelete } from "@/lib/hubspot/crm-client";

export function registerNoteDelete(server: McpServer) {
  server.tool(
  "note_delete",
  `HubSpot メモを削除する（ゴミ箱へ移動）。
公式仕様 (knowledge.hubspot.com): "You can restore deleted activities such as notes, calls, meetings
and tasks logged on a record. The deletion must have occurred within 90 days."
すなわち、API経由で削除されたメモは関連レコード（コンタクト・会社・取引等）のタイムラインから
90日以内なら復元可能（HubSpot UI: 各レコード > Actions > Restore activity）。
注意: email_delete とは異なる挙動（email は永久削除）。
confirm=true が必須。
公式: DELETE /crm/v3/objects/notes/{noteId}`,
  {
    noteId: z.string().describe("メモのID（数値文字列）。note_searchの返却値のidフィールドから取得"),
    confirm: z.boolean().describe("削除確認フラグ（trueを指定して実行。誤削除防止）"),
  },
  async ({ noteId, confirm }) => {
    if (!confirm) return { content: [{ type: "text" as const, text: "confirm=trueを指定してください" }] };
    await crmDelete("notes", noteId);
    return {
      content: [{ type: "text" as const, text: JSON.stringify({ deleted: true, id: noteId }) }],
    };
  }
);
}
