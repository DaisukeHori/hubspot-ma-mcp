import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { updateBlogPost } from "../../hubspot/crm-client";
import { formatToolResult, prettyParam } from "@/lib/mcp/utils/format-result";

export function registerCmsBlogUpdate(server: McpServer) {
  server.tool(
    "cms_blog_update",
    `HubSpot CMS のブログ記事を部分更新する（PATCH=指定フィールドのみ上書き）。
更新可能: name（タイトル）, postBody（本文HTML）, metaDescription（SEOメタ説明）,
slug（URLパス）, state（DRAFT / PUBLISHED）。
公開記事を更新するときも state="DRAFT" にせず直接更新可能だが、
本文を大きく書き換える場合は draft 経由（HubSpot UI）の方が安全。
additionalUpdates で htmlTitle, featuredImage, tagIds, blogAuthorId 等を渡せる。
公式: PATCH /cms/v3/blogs/posts/{postId}`,
    {
      postId: z.string().describe("ブログ記事 ID"),
      name: z.string().optional().describe("ブログ記事タイトル（例: '2026年のヘアトレンド予測'）"),
      postBody: z.string().optional().describe("記事本文（HTML）"),
      metaDescription: z.string().optional().describe("メタディスクリプション"),
      slug: z.string().optional().describe("スラグ（URLパス）"),
      state: z.enum(["DRAFT", "PUBLISHED"]).optional().describe("公開状態（DRAFT / PUBLISHED / SCHEDULED）"),
      additionalUpdates: z.record(z.unknown()).optional().describe("その他の更新フィールド"),
    
      pretty: prettyParam,
},
    async ({ postId, name, postBody, metaDescription, slug, state, additionalUpdates, pretty }) => {
      const updates: Record<string, unknown> = {};
      if (name !== undefined) updates.name = name;
      if (postBody !== undefined) updates.postBody = postBody;
      if (metaDescription !== undefined) updates.metaDescription = metaDescription;
      if (slug !== undefined) updates.slug = slug;
      if (state !== undefined) updates.state = state;
      if (additionalUpdates) Object.assign(updates, additionalUpdates);
      const result = await updateBlogPost(postId, updates);
      return { content: [{ type: "text", text: formatToolResult(result, pretty) }] };
    }
  );
}
