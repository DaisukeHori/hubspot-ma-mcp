import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { updateCmsPage } from "../../hubspot/crm-client";

export function registerCmsPageUpdate(server: McpServer) {
  server.tool(
    "cms_page_update",
    `HubSpot CMS のランディングページまたはサイトページを更新する。

【layoutSections について】
LP/サイトページのモジュール（フォーム埋め込み、リッチテキスト、画像等）は layoutSections オブジェクト
の中に定義されている。LP内のフォームIDを差し替えるには、まず cms_page_list で対象ページを特定し、
その layoutSections の中の form モジュールの form_id を書き換えて layoutSections 全体を再送する。

【layoutSections の構造（実物例）】
layoutSections = {
  "<sectionId>": {
    "name": "...",
    "rows": [...],
    "type": "section",
    "cells": [...]
  },
  ...
}
中身は HubSpot 側の独自構造のため z.record(z.unknown()) で素通しする。`,
    {
      pageType: z
        .enum(["landing-pages", "site-pages"])
        .describe(
          "ページ種別: landing-pages（ランディングページ）または site-pages（サイトページ）"
        ),
      pageId: z
        .string()
        .describe(
          "ページレコードID（数値文字列）。cms_page_listの返却値のidから取得"
        ),
      name: z.string().optional().describe("ページ名（タイトル）"),
      slug: z.string().optional().describe("スラグ（URLパス）"),
      state: z
        .enum(["DRAFT", "PUBLISHED", "SCHEDULED"])
        .optional()
        .describe("公開状態（DRAFT / PUBLISHED / SCHEDULED）"),
      htmlTitle: z.string().optional().describe("HTMLタイトル"),
      metaDescription: z.string().optional().describe("メタディスクリプション"),
      layoutSections: z
        .record(z.unknown())
        .optional()
        .describe(
          "ページのレイアウト・モジュール定義（フォーム埋め込みのform_id差し替え等に使用）。" +
            "更新前にcms_page_listのfullオプションで取得し、変更したいモジュールのみ書き換えて全体を送信すること。"
        ),
      additionalUpdates: z
        .record(z.unknown())
        .optional()
        .describe(
          "その他の更新フィールド（archivedInDashboard, password, publishDate, language, translations 等）"
        ),
    },
    async ({
      pageType,
      pageId,
      name,
      slug,
      state,
      htmlTitle,
      metaDescription,
      layoutSections,
      additionalUpdates,
    }) => {
      const updates: Record<string, unknown> = {};
      if (name !== undefined) updates.name = name;
      if (slug !== undefined) updates.slug = slug;
      if (state !== undefined) updates.state = state;
      if (htmlTitle !== undefined) updates.htmlTitle = htmlTitle;
      if (metaDescription !== undefined) updates.metaDescription = metaDescription;
      if (layoutSections !== undefined) updates.layoutSections = layoutSections;
      if (additionalUpdates) Object.assign(updates, additionalUpdates);
      const result = await updateCmsPage(pageType, pageId, updates);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );
}
