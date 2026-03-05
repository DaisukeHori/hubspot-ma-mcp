import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getHubSpotToken } from "@/lib/hubspot/auth-context";
import { HubSpotError } from "@/lib/hubspot/errors";

const BASE_URL = "https://api.hubapi.com";

function getHeaders(): Record<string, string> {
  return { Authorization: `Bearer ${getHubSpotToken()}`, "Content-Type": "application/json" };
}

export function registerCampaignAssetAssociate(server: McpServer) {
  server.tool(
    "campaign_asset_associate",
    `HubSpot キャンペーンにアセット（メール・フォーム・ワークフロー・ブログ記事等）を紐付け/解除する。

action=associate: PUT /marketing/v3/campaigns/{campaignGuid}/assets/{assetType}/{assetId}
action=disassociate: DELETE /marketing/v3/campaigns/{campaignGuid}/assets/{assetType}/{assetId}

対応アセットタイプ: MARKETING_EMAIL, FORM, OBJECT_LIST, EXTERNAL_WEB_URL, WORKFLOW, AD, SOCIAL_POST, CTA, BLOG_POST, LANDING_PAGE, SITE_PAGE

スコープ: marketing.campaigns.write`,
    {
      campaignId: z.string().describe("キャンペーンGUID（UUID形式）"),
      assetType: z.enum([
        "MARKETING_EMAIL", "FORM", "OBJECT_LIST", "EXTERNAL_WEB_URL",
        "WORKFLOW", "AD", "SOCIAL_POST", "CTA", "BLOG_POST",
        "LANDING_PAGE", "SITE_PAGE"
      ]).describe("アセットタイプ。MARKETING_EMAIL=メール, FORM=フォーム, OBJECT_LIST=リスト, WORKFLOW=ワークフロー, BLOG_POST=ブログ記事, LANDING_PAGE=LP, SITE_PAGE=サイトページ, AD=広告, SOCIAL_POST=SNS投稿, CTA=CTA, EXTERNAL_WEB_URL=外部URL"),
      assetId: z.string().describe("アセットID（メールID、フォームUUID、リストID、ワークフローID等）"),
      action: z.enum(["associate", "disassociate"]).describe("操作: associate=紐付け, disassociate=解除"),
    },
    async ({ campaignId, assetType, assetId, action }) => {
      try {
        const method = action === "associate" ? "PUT" : "DELETE";
        const response = await fetch(
          `${BASE_URL}/marketing/v3/campaigns/${campaignId}/assets/${assetType}/${assetId}`,
          { method, headers: getHeaders() }
        );
        if (!response.ok) {
          let message = response.statusText;
          try { const body = await response.json(); message = body.message || JSON.stringify(body); } catch { /* ignore */ }
          throw new HubSpotError(response.status, message);
        }
        const verb = action === "associate" ? "紐付け" : "解除";
        return { content: [{ type: "text" as const, text: `キャンペーン ${campaignId} のアセット ${assetType}/${assetId} を${verb}しました。` }] };
      } catch (error) {
        const message = error instanceof HubSpotError ? `HubSpot API エラー (${error.status}): ${error.message}` : String(error);
        return { content: [{ type: "text" as const, text: message }], isError: true };
      }
    }
  );
}
