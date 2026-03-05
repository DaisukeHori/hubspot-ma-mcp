import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getHubSpotToken } from "@/lib/hubspot/auth-context";
import { HubSpotError } from "@/lib/hubspot/errors";

const BASE_URL = "https://api.hubapi.com";
const GOAL_PROPS = "hs_goal_name,hs_target_amount,hs_start_datetime,hs_end_datetime,hs_created_by_user_id";

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

function handleError(error: unknown) {
  const message = error instanceof HubSpotError ? `HubSpot API エラー (${error.status}): ${error.message}` : String(error);
  return { content: [{ type: "text" as const, text: message }], isError: true };
}

export function registerHubspotGoals(server: McpServer) {
  // --- goal_list ---
  server.tool(
    "goal_list",
    `HubSpot の目標（Goals / goal_targets）を一覧取得する。読み取り専用。
セールス・サービスチーム向けのKPI目標（収益目標、通話回数目標等）をHubSpot UIで設定したものを取得。
返却: id, hs_goal_name, hs_target_amount, hs_start_datetime, hs_end_datetime, hs_created_by_user_id。`,
    {
      limit: z.number().optional().describe("取得件数（デフォルト20、最大100）"),
      after: z.string().optional().describe("ページネーションカーソル"),
    },
    async ({ limit, after }) => {
      try {
        const params = new URLSearchParams({ properties: GOAL_PROPS, limit: String(limit || 20) });
        if (after) params.set("after", after);
        const data = await fetchJson<Record<string, unknown>>(
          `${BASE_URL}/crm/v3/objects/goal_targets?${params}`,
          { method: "GET", headers: getHeaders() }
        );
        return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
      } catch (error) { return handleError(error); }
    }
  );

  // --- goal_get ---
  server.tool(
    "goal_get",
    `HubSpot の目標（goal_target）を1件取得する。読み取り専用。
返却: id, hs_goal_name, hs_target_amount, hs_start_datetime, hs_end_datetime, hs_created_by_user_id。`,
    {
      goalId: z.string().describe("目標ID"),
      properties: z.string().optional().describe("追加取得するプロパティ（カンマ区切り）"),
    },
    async ({ goalId, properties }) => {
      try {
        const props = properties ? `${GOAL_PROPS},${properties}` : GOAL_PROPS;
        const data = await fetchJson<Record<string, unknown>>(
          `${BASE_URL}/crm/v3/objects/goal_targets/${goalId}?properties=${encodeURIComponent(props)}`,
          { method: "GET", headers: getHeaders() }
        );
        return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
      } catch (error) { return handleError(error); }
    }
  );

  // --- goal_search ---
  server.tool(
    "goal_search",
    `HubSpot の目標（goal_targets）を検索する。読み取り専用。
フィルタで特定期間・特定名・特定金額の目標を絞り込み可能。
filterGroups/sorts/propertiesはCRM Search API標準形式。`,
    {
      filterGroups: z.array(z.object({
        filters: z.array(z.object({
          propertyName: z.string(),
          operator: z.string(),
          value: z.string(),
        })),
      })).optional().describe("検索フィルタ"),
      query: z.string().optional().describe("キーワード検索"),
      limit: z.number().optional().describe("取得件数（デフォルト10）"),
      after: z.string().optional().describe("ページネーションカーソル"),
    },
    async ({ filterGroups, query, limit, after }) => {
      try {
        const body: Record<string, unknown> = {
          properties: GOAL_PROPS.split(","),
          limit: limit || 10,
        };
        if (filterGroups) body.filterGroups = filterGroups;
        if (query) body.query = query;
        if (after) body.after = after;
        const data = await fetchJson<Record<string, unknown>>(
          `${BASE_URL}/crm/v3/objects/goal_targets/search`,
          { method: "POST", headers: getHeaders(), body: JSON.stringify(body) }
        );
        return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
      } catch (error) { return handleError(error); }
    }
  );
}
