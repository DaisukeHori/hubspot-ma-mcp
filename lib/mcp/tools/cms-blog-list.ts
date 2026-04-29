import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { listBlogPosts } from "../../hubspot/crm-client";
import { formatToolResult, prettyParam } from "@/lib/mcp/utils/format-result";

export function registerCmsBlogList(server: McpServer) {
  server.tool(
    "cms_blog_list",
    `HubSpot CMSのブログ記事一覧を取得する。ページネーション対応。

返却: ブログ記事の配列（ID, name, slug, state, publishDate, postBody等）。`,
    {
      limit: z.number().optional().describe("取得件数（デフォルト20、最大100）"),
      after: z.string().optional().describe("ページネーション"),
    
      pretty: prettyParam,
},
    async ({ limit, after, pretty }) => {
      const result = await listBlogPosts(limit || 20, after);
      return { content: [{ type: "text", text: formatToolResult(result, pretty) }] };
    }
  );
}
