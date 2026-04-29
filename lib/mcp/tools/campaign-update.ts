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

export function registerCampaignUpdate(server: McpServer) {
  server.tool(
    "campaign_update",
    `HubSpot マーケティングキャンペーンを部分更新する（PATCH=指定プロパティのみ上書き）。
キャンペーンはメール・フォーム・リスト・ワークフロー・広告等を束ねる上位概念。

主要プロパティ:
- hs_name（キャンペーン名）
- hs_start_date, hs_end_date（開始日・終了日 YYYY-MM-DD 形式）
- hs_notes（メモ・備考）
- hs_color（色 HEX形式 '#RRGGBB'）
- hs_owner（オーナーID = HubSpotユーザーID）
- hs_audience（ターゲット記述テキスト）
- hs_goal（目標記述テキスト）
- hs_utm（UTMパラメータ オブジェクト: {utm_campaign, utm_source, utm_medium, utm_content}, 2025/7以降読み書き対応）
キャンペーンへのアセット紐付けは campaign_asset_associate を別途使用。
スコープ: marketing.campaigns.write
公式: PATCH /marketing/v3/campaigns/{campaignId}`,
    {
      campaignId: z.string().describe("キャンペーンGUID（UUID形式）"),
      properties: z.record(z.unknown()).describe("更新するプロパティ（JSON）。hs_name, hs_start_date, hs_end_date, hs_notes, hs_utm等"),
    
      pretty: prettyParam,
},
    async ({ campaignId, properties, pretty }) => {
      try {
        const result = await fetchJson<Record<string, unknown>>(
          `${BASE_URL}/marketing/v3/campaigns/${campaignId}`,
          { method: "PATCH", headers: getHeaders(), body: JSON.stringify({ properties }) }
        );
        return { content: [{ type: "text" as const, text: formatToolResult(result, pretty) }] };
      } catch (error) {
        const message = error instanceof HubSpotError ? `HubSpot API エラー (${error.status}): ${error.message}` : String(error);
        return { content: [{ type: "text" as const, text: message }], isError: true };
      }
    }
  );
}
