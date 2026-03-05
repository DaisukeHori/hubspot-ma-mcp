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

export function registerCampaignUpdate(server: McpServer) {
  server.tool(
    "campaign_update",
    `HubSpot キャンペーンを部分更新する（PATCH）。指定したプロパティのみ上書き。

スコープ: marketing.campaigns.write`,
    {
      campaignId: z.string().describe("キャンペーンGUID（UUID形式）"),
      properties: z.record(z.unknown()).describe("更新するプロパティ（JSON）。hs_name, hs_start_date, hs_end_date, hs_notes, hs_utm等"),
    },
    async ({ campaignId, properties }) => {
      try {
        const result = await fetchJson<Record<string, unknown>>(
          `${BASE_URL}/marketing/v3/campaigns/${campaignId}`,
          { method: "PATCH", headers: getHeaders(), body: JSON.stringify({ properties }) }
        );
        return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
      } catch (error) {
        const message = error instanceof HubSpotError ? `HubSpot API エラー (${error.status}): ${error.message}` : String(error);
        return { content: [{ type: "text" as const, text: message }], isError: true };
      }
    }
  );
}
