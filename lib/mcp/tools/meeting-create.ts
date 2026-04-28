import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { crmCreate } from "@/lib/hubspot/crm-client";

export function registerMeetingCreate(server: McpServer) {
  server.tool(
  "meeting_create",
  "新しいミーティングエンゲージメントを作成する。返却値: id, properties, createdAt。associationsで既存レコードに紐付け可能。",
  {
    properties: z.record(z.string()).describe("ミーティングのプロパティ（キー:値）。hs_timestampは必須（ISO8601/Unixミリ秒。省略時はhs_meeting_start_timeが使われる）。主要プロパティ: hs_meeting_title(タイトル), hs_meeting_body(説明), hs_meeting_start_time(開始), hs_meeting_end_time(終了), hs_meeting_outcome(SCHEDULED/COMPLETED/RESCHEDULED/NO_SHOW/CANCELED), hs_meeting_location(場所), hs_meeting_external_url(外部URL), hs_internal_meeting_notes(内部メモ), hubspot_owner_id(担当者ID), hs_activity_type(ミーティングタイプ)"),
    associations: z.array(z.object({
      to: z.object({ id: z.string().describe("関連先レコードID") }).describe("関連先レコード"),
      types: z.array(z.object({
        associationCategory: z.enum(["HUBSPOT_DEFINED", "USER_DEFINED"]).describe("HUBSPOT_DEFINED=標準ラベル / USER_DEFINED=カスタムラベル（公式仕様準拠）"),
        associationTypeId: z.number().describe("関連タイプID。association_labelsツールのlistで取得可能"),
      })).describe("関連タイプ定義の配列"),
    })).optional().describe("関連付け先レコードの配列"),
  },
  async ({ properties, associations }) => {
    const result = await crmCreate("meetings", properties, associations);
    return {
      content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
    };
  }
);
}
