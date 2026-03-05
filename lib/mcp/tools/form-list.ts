import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getHubSpotToken } from "@/lib/hubspot/auth-context";
import { HubSpotError } from "@/lib/hubspot/errors";

const BASE_URL = "https://api.hubapi.com";

async function fetchJson<T>(url: string, options: RequestInit): Promise<T> {
  const response = await fetch(url, options);
  if (!response.ok) {
    let message = response.statusText;
    try {
      const body = await response.json();
      message = body.message || JSON.stringify(body);
    } catch { /* ignore */ }
    throw new HubSpotError(response.status, message);
  }
  return response.json() as Promise<T>;
}

function getHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${getHubSpotToken()}`,
    "Content-Type": "application/json",
  };
}

export function registerFormList(server: McpServer) {
  server.tool(
    "form_list",
    `HubSpot のフォーム一覧を取得する。マーケティングフォーム・ポップアップフォーム・キャプチャフォーム等を含む。

返却: フォームの配列（id, name, formType, createdAt, updatedAt, archived, fieldGroups等）。
ページネーション対応（after パラメータ）。`,
    {
      limit: z.number().min(1).max(100).optional().describe("取得件数（デフォルト20、最大100）"),
      after: z.string().optional().describe("ページネーション用カーソル（前回レスポンスのpaging.next.afterの値）"),
      formTypes: z.array(z.enum(["hubspot", "captured", "flow", "blog_comment"])).optional().describe("フォームタイプでフィルタ。hubspot=通常フォーム, captured=外部HTMLフォーム, flow=ポップアップ, blog_comment=ブログコメント"),
      archived: z.boolean().optional().describe("アーカイブ済みフォームを含めるか（デフォルト false）"),
    },
    async ({ limit, after, formTypes, archived }) => {
      try {
        const params = new URLSearchParams();
        if (limit) params.set("limit", String(limit));
        if (after) params.set("after", after);
        if (formTypes) formTypes.forEach(t => params.append("formTypes", t));
        if (archived !== undefined) params.set("archived", String(archived));

        const qs = params.toString() ? `?${params.toString()}` : "";
        const result = await fetchJson<{
          total: number;
          results: Array<Record<string, unknown>>;
          paging?: { next?: { after: string } };
        }>(`${BASE_URL}/marketing/v3/forms${qs}`, {
          method: "GET",
          headers: getHeaders(),
        });

        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify({
              total: result.total,
              count: result.results.length,
              paging: result.paging,
              results: result.results,
            }, null, 2),
          }],
        };
      } catch (error) {
        const message = error instanceof HubSpotError
          ? `HubSpot API エラー (${error.status}): ${error.message}`
          : String(error);
        return { content: [{ type: "text" as const, text: message }], isError: true };
      }
    }
  );
}
