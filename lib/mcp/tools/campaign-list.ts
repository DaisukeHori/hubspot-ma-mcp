import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getHubSpotToken } from "@/lib/hubspot/auth-context";
import { HubSpotError } from "@/lib/hubspot/errors";

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

export function registerCampaignList(server: McpServer) {
  server.tool(
    "campaign_list",
    `HubSpot マーケティングキャンペーン一覧を取得する。キャンペーンはメール・フォーム・リスト・ワークフロー等を束ねる上位概念。

返却: キャンペーンの配列（id/campaignGuid, properties: hs_name, hs_start_date, hs_end_date, hs_notes, hs_utm等）。
スコープ: marketing.campaigns.read`,
    {
      limit: z.number().min(1).max(100).optional().describe("取得件数（デフォルト10、最大100）"),
      after: z.string().optional().describe("ページネーション用カーソル"),
      properties: z.array(z.string()).optional().describe("取得するプロパティ名の配列（例: ['hs_name','hs_start_date','hs_end_date','hs_notes','hs_utm']）"),
    },
    async ({ limit, after, properties }) => {
      try {
        const params = new URLSearchParams();
        if (limit) params.set("limit", String(limit));
        if (after) params.set("after", after);
        if (properties) properties.forEach(p => params.append("properties", p));
        const qs = params.toString() ? `?${params.toString()}` : "";

        const result = await fetchJson<Record<string, unknown>>(
          `${BASE_URL}/marketing/v3/campaigns${qs}`,
          { method: "GET", headers: getHeaders() }
        );
        return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
      } catch (error) {
        const message = error instanceof HubSpotError ? `HubSpot API エラー (${error.status}): ${error.message}` : String(error);
        return { content: [{ type: "text" as const, text: message }], isError: true };
      }
    }
  );
}
