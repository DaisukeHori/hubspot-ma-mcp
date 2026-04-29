import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getHubSpotToken } from "@/lib/hubspot/auth-context";
import { HubSpotError } from "@/lib/hubspot/errors";
import { formatToolResult, prettyParam } from "@/lib/mcp/utils/format-result";

const BASE_URL = "https://api.hubapi.com";

async function fetchJson<T>(url: string, options: RequestInit): Promise<T> {
  const response = await fetch(url, options);
  if (!response.ok) {
    let message = response.statusText;
    try { const body = await response.json(); message = body.message || JSON.stringify(body); } catch { /* ignore */ }
    throw new HubSpotError(response.status, message);
  }
  return response.json() as Promise<T>;
}

function getHeaders(): Record<string, string> {
  return { Authorization: `Bearer ${getHubSpotToken()}`, "Content-Type": "application/json" };
}

export function registerCampaignCreate(server: McpServer) {
  server.tool(
    "campaign_create",
    `HubSpot マーケティングキャンペーンを新規作成する。メール・フォーム・リスト・広告等を束ねるキャンペーンオブジェクトを作成。

返却: id(campaignGuid), properties, createdAt, updatedAt。
作成後はcampaign_asset_associateでメール・フォーム・ワークフロー等のアセットを紐付け可能。

スコープ: marketing.campaigns.write`,
    {
      properties: z.object({
        hs_name: z.string().describe("キャンペーン名（例: '2026年4月セミナーキャンペーン'）"),
        hs_start_date: z.string().optional().describe("開始日（YYYY-MM-DD形式）"),
        hs_end_date: z.string().optional().describe("終了日（YYYY-MM-DD形式）"),
        hs_notes: z.string().optional().describe("メモ・備考"),
        hs_utm: z.record(z.string()).optional().describe("UTMパラメータ（オブジェクト）。{utm_campaign: 'campaign_name', utm_source: 'email', utm_medium: 'marketing_email', utm_content: '...'} 形式。2025/7以降読み書き対応"),
      }).describe("キャンペーンプロパティ。hs_nameは必須"),
    
      pretty: prettyParam,
},
    async ({ properties, pretty }) => {
      try {
        const result = await fetchJson<Record<string, unknown>>(
          `${BASE_URL}/marketing/v3/campaigns`,
          { method: "POST", headers: getHeaders(), body: JSON.stringify({ properties }) }
        );
        return { content: [{ type: "text" as const, text: formatToolResult(result, pretty) }] };
      } catch (error) {
        const message = error instanceof HubSpotError ? `HubSpot API エラー (${error.status}): ${error.message}` : String(error);
        return { content: [{ type: "text" as const, text: message }], isError: true };
      }
    }
  );
}
