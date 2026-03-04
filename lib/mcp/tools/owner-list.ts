import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { listOwners } from "@/lib/hubspot/crm-client";

export function registerOwnerList(server: McpServer) {
  server.tool(
  "owner_list",
  "HubSpotアカウント内の担当者（オーナー）一覧を取得する。返却値: 各オーナーのid, email, firstName, lastName, userId, teams。contact_create等のhubspot_owner_idやownerId指定時に必要なIDを確認できる。",
  {
    limit: z.number().min(1).max(500).optional().describe("取得件数（デフォルト100、最大500）"),
    after: z.string().optional().describe("ページネーション用カーソル（前回レスポンスのpaging.next.afterの値を指定）"),
    email: z.string().optional().describe("メールアドレスで絞り込み（完全一致）"),
  },
  async ({ limit, after, email }) => {
    const result = await listOwners(limit ?? 100, after, email);
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }
);
}
