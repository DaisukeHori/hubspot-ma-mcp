import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { updateCmsPage } from "../../hubspot/crm-client";

export function registerCmsPageUpdate(server: McpServer) {
  server.tool(
    "cms_page_update",
    "HubSpot CMS のランディングページまたはサイトページを更新する",
    {
      pageType: z.enum(["landing-pages", "site-pages"]).describe("ページ種別"),
      pageId: z.string().describe("ページ ID"),
      name: z.string().optional().describe("ページ名"),
      slug: z.string().optional().describe("スラグ（URLパス）"),
      state: z.enum(["DRAFT", "PUBLISHED"]).optional().describe("公開状態"),
      htmlTitle: z.string().optional().describe("HTMLタイトル"),
      metaDescription: z.string().optional().describe("メタディスクリプション"),
      additionalUpdates: z.record(z.unknown()).optional().describe("その他の更新フィールド"),
    },
    async ({ pageType, pageId, name, slug, state, htmlTitle, metaDescription, additionalUpdates }) => {
      const updates: Record<string, unknown> = {};
      if (name !== undefined) updates.name = name;
      if (slug !== undefined) updates.slug = slug;
      if (state !== undefined) updates.state = state;
      if (htmlTitle !== undefined) updates.htmlTitle = htmlTitle;
      if (metaDescription !== undefined) updates.metaDescription = metaDescription;
      if (additionalUpdates) Object.assign(updates, additionalUpdates);
      const result = await updateCmsPage(pageType, pageId, updates);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );
}
