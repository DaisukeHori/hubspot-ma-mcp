import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getOwner } from "@/lib/hubspot/crm-client";
import { formatToolResult, prettyParam } from "@/lib/mcp/utils/format-result";

export function registerOwnerGet(server: McpServer) {
  server.tool(
  "owner_get",
  "指定IDの担当者（オーナー）詳細を取得する。返却値: id, email, firstName, lastName, userId, teams（所属チーム情報）。",
  {
    ownerId: z.string().describe("オーナーID（数値文字列）。owner_listの返却値のidフィールドから取得"),
  
      pretty: prettyParam,
},
  async ({ ownerId, pretty }) => {
    const result = await getOwner(ownerId);
    return {
      content: [
        {
          type: "text" as const,
          text: formatToolResult(result, pretty),
        },
      ],
    };
  }
);
}
