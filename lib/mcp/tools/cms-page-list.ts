import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { listCmsPages } from "../../hubspot/crm-client";

export function registerCmsPageList(server: McpServer) {
  server.tool(
    "cms_page_list",
    "HubSpot CMS のランディングページまたはサイトページの一覧を取得する",
    {
      pageType: z.enum(["landing-pages", "site-pages"]).describe("ページ種別"),
      limit: z.number().optional().describe("取得件数（デフォルト20、最大100）"),
      after: z.string().optional().describe("ページネーション"),
    },
    async ({ pageType, limit, after }) => {
      const result = await listCmsPages(pageType, limit || 20, after);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );
}
