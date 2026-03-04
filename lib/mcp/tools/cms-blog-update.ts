import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { updateBlogPost } from "../../hubspot/crm-client";

export function registerCmsBlogUpdate(server: McpServer) {
  server.tool(
    "cms_blog_update",
    "HubSpot CMS のブログ記事を更新する（タイトル・本文・メタ情報・公開状態等）",
    {
      postId: z.string().describe("ブログ記事 ID"),
      name: z.string().optional().describe("記事タイトル"),
      postBody: z.string().optional().describe("記事本文（HTML）"),
      metaDescription: z.string().optional().describe("メタディスクリプション"),
      slug: z.string().optional().describe("スラグ（URLパス）"),
      state: z.enum(["DRAFT", "PUBLISHED"]).optional().describe("公開状態"),
      additionalUpdates: z.record(z.unknown()).optional().describe("その他の更新フィールド"),
    },
    async ({ postId, name, postBody, metaDescription, slug, state, additionalUpdates }) => {
      const updates: Record<string, unknown> = {};
      if (name !== undefined) updates.name = name;
      if (postBody !== undefined) updates.postBody = postBody;
      if (metaDescription !== undefined) updates.metaDescription = metaDescription;
      if (slug !== undefined) updates.slug = slug;
      if (state !== undefined) updates.state = state;
      if (additionalUpdates) Object.assign(updates, additionalUpdates);
      const result = await updateBlogPost(postId, updates);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );
}
