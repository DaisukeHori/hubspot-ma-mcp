import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { crmUpdate } from "@/lib/hubspot/crm-client";

export function registerCallUpdate(server: McpServer) {
  server.tool(
  "call_update",
  "指定IDの通話エンゲージメントを部分更新する。指定したプロパティのみ更新。返却値: id, properties, updatedAt。",
  {
    callId: z.string().describe("通話のエンゲージメントID（数値文字列）。call_searchの返却値のidフィールドから取得"),
    properties: z.record(z.string()).describe("更新するプロパティ（キー:値）。省略したプロパティは変更されない"),
  },
  async ({ callId, properties }) => {
    const result = await crmUpdate("calls", callId, properties);
    return {
      content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
    };
  }
);
}
