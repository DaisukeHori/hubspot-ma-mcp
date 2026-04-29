import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { crmUpdate } from "@/lib/hubspot/crm-client";
import { formatToolResult, prettyParam } from "@/lib/mcp/utils/format-result";

export function registerCallUpdate(server: McpServer) {
  server.tool(
  "call_update",
  `指定IDの通話エンゲージメントを部分更新する（PATCH=指定プロパティのみ上書き）。
主要プロパティ:
- hs_call_title（タイトル）, hs_call_body（本文HTML/メモ）
- hs_call_duration（通話時間ミリ秒）
- hs_call_direction（INBOUND / OUTBOUND）
- hs_call_status（COMPLETED / NO_ANSWER / BUSY / FAILED / CANCELED 等の11値）
- hs_call_from_number, hs_call_to_number（発信元/着信先 電話番号）
- hs_call_recording_url（通話録音URL HTTPS .mp3/.wav）
- hs_call_disposition（結果GUID。Connected, Busy, No answer 等の値はcall_create のdescで参照）
- hs_timestamp（タイムスタンプ）, hubspot_owner_id（担当者）
返却: id, properties, updatedAt。
公式: PATCH /crm/v3/objects/calls/{callId}`,
  {
    callId: z.string().describe("通話のエンゲージメントID（数値文字列）。call_searchの返却値のidフィールドから取得"),
    properties: z.record(z.string()).describe("更新するプロパティ（キー:値）。省略したプロパティは変更されない"),
  
      pretty: prettyParam,
},
  async ({ callId, properties, pretty }) => {
    const result = await crmUpdate("calls", callId, properties);
    return {
      content: [{ type: "text" as const, text: formatToolResult(result, pretty) }],
    };
  }
);
}
