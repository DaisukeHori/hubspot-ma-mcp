import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { listCmsPages } from "../../hubspot/crm-client";

export function registerCmsPageList(server: McpServer) {
  server.tool(
    "cms_page_list",
    `HubSpot CMS のランディングページ（landing-pages）またはウェブサイトページ（site-pages）一覧を取得する。
返却: 各ページの id, name, slug, state（DRAFT/PUBLISHED/SCHEDULED）, url, createdAt, updatedAt,
layoutSections / widgets / widgetContainers（モジュール構造）等を含む完全なページオブジェクトの配列。
ページ内のフォーム埋め込みを差し替えるには、まずこれで対象ページを特定→
cms_page_replace_form_widget で form_id を一括置換。
ページネーション: paging.next.after を次回 after に渡す。
公式: GET /cms/v3/pages/{pageType}`,
    {
      pageType: z.enum(["landing-pages", "site-pages"]).describe("ページ種別: landing-pages（ランディングページ）または site-pages（サイトページ）"),
      limit: z.number().optional().describe("取得件数（デフォルト20、最大100）"),
      after: z.string().optional().describe("ページネーション"),
    },
    async ({ pageType, limit, after }) => {
      const result = await listCmsPages(pageType, limit || 20, after);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );
}
