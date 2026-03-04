import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { listBlogPosts } from "../../hubspot/crm-client";

export function registerCmsBlogList(server: McpServer) {
  server.tool(
    "cms_blog_list",
    "HubSpot CMS のブログ記事一覧を取得する",
    {
      limit: z.number().optional().describe("取得件数（デフォルト20、最大100）"),
      after: z.string().optional().describe("ページネーション"),
    },
    async ({ limit, after }) => {
      const result = await listBlogPosts(limit || 20, after);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );
}
