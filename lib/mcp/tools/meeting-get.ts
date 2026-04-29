import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { crmGet } from "@/lib/hubspot/crm-client";
import { formatToolResult, prettyParam } from "@/lib/mcp/utils/format-result";

export function registerMeetingGet(server: McpServer) {
  server.tool(
  "meeting_get",
  "指定IDのミーティングエンゲージメント詳細を取得する。返却値: id, properties（hs_meeting_title, hs_meeting_body, hs_meeting_start_time, hs_meeting_end_time等）, createdAt, updatedAt, associations。",
  {
    meetingId: z.string().describe("ミーティングのエンゲージメントID（数値文字列）。meeting_searchの返却値のidフィールドから取得"),
    properties: z.array(z.string()).optional().describe("取得するプロパティ名の配列。省略時はデフォルトプロパティのみ"),
    associations: z.array(z.string()).optional().describe("取得する関連オブジェクト（例: ['contacts','companies','deals']）"),
  
      pretty: prettyParam,
},
  async ({ meetingId, properties, associations, pretty }) => {
    const result = await crmGet("meetings", meetingId, properties, associations);
    return {
      content: [{ type: "text" as const, text: formatToolResult(result, pretty) }],
    };
  }
);
}
