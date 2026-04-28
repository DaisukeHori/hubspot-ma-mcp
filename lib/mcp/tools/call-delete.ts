import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { crmDelete } from "@/lib/hubspot/crm-client";

export function registerCallDelete(server: McpServer) {
  server.tool(
  "call_delete",
  `指定IDの通話エンゲージメントを削除する（ゴミ箱へ移動）。
公式仕様 (knowledge.hubspot.com): "You can restore deleted activities such as notes, calls, meetings
and tasks logged on a record. The deletion must have occurred within 90 days."
すなわち、API経由で削除された通話は関連レコード（コンタクト・会社・取引等）のタイムラインから
90日以内なら復元可能（HubSpot UI: 各レコード > Actions > Restore activity）。
注意: email_delete とは異なる挙動（email は永久削除）。
通話録音（hs_call_recording_url で参照されるファイル）は別途ファイルストレージに保存されており、
通話削除では消えない可能性あり。
confirm=true が必須。
公式: DELETE /crm/v3/objects/calls/{callId}`,
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
