import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { crmUpdate } from "@/lib/hubspot/crm-client";

export function registerMeetingUpdate(server: McpServer) {
  server.tool(
  "meeting_update",
  `指定IDのミーティングエンゲージメントを部分更新する（PATCH=指定プロパティのみ上書き）。
主要プロパティ:
- hs_meeting_title（タイトル）, hs_meeting_body（本文HTML）
- hs_internal_meeting_notes（内部メモ）
- hs_meeting_external_url（Zoom等の会議URL）, hs_meeting_location（場所）
- hs_meeting_start_time, hs_meeting_end_time（開始/終了時刻 ISO 8601）
- hs_meeting_outcome（SCHEDULED / COMPLETED / RESCHEDULED / NO_SHOW / CANCELED）
- hs_timestamp（タイムスタンプ）, hubspot_owner_id（担当者）
返却: id, properties, updatedAt。
公式: PATCH /crm/v3/objects/meetings/{meetingId}`,
  {
    meetingId: z.string().describe("ミーティングのエンゲージメントID（数値文字列）。meeting_searchの返却値のidフィールドから取得"),
    properties: z.record(z.string()).describe("更新するプロパティ（キー:値）。省略したプロパティは変更されない"),
  },
  async ({ meetingId, properties }) => {
    const result = await crmUpdate("meetings", meetingId, properties);
    return {
      content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
    };
  }
);
}
