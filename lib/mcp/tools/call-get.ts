import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { crmGet } from "@/lib/hubspot/crm-client";
import { formatToolResult, prettyParam } from "@/lib/mcp/utils/format-result";

export function registerCallGet(server: McpServer) {
  server.tool(
  "call_get",
  "指定IDの通話エンゲージメント詳細を取得する。返却値: id, properties（hs_call_title, hs_call_body, hs_call_duration, hs_call_direction, hs_call_status等）, createdAt, updatedAt, associations。",
  {
    callId: z.string().describe("通話のエンゲージメントID（数値文字列）。call_searchの返却値のidフィールドから取得"),
    properties: z.array(z.string()).optional().describe("取得するプロパティ名の配列。省略時はデフォルトプロパティのみ"),
    associations: z.array(z.string()).optional().describe("取得する関連オブジェクト（例: ['contacts','companies','deals']）"),
  
      pretty: prettyParam,
},
  async ({ callId, properties, associations, pretty }) => {
    const result = await crmGet("calls", callId, properties, associations);
    return {
      content: [{ type: "text" as const, text: formatToolResult(result, pretty) }],
    };
  }
);
}
