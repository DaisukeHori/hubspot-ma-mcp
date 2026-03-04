import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { crmUpdate } from "@/lib/hubspot/crm-client";

export function registerMeetingUpdate(server: McpServer) {
  server.tool(
  "meeting_update",
  "指定IDのミーティングエンゲージメントを部分更新する。指定したプロパティのみ更新。返却値: id, properties, updatedAt。",
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
