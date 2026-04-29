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

export function registerMarketingEmailList(server: McpServer) {
  server.tool(
    "marketing_email_list",
    `HubSpot マーケティングメール一覧を取得する。ニュースレター、キャンペーンメール、自動メール等の一覧。

返却: メールの配列（id, name, subject, state, type, publishDate, stats等）。
注意: これはマーケティングメール（一斉配信メール）のAPI。1対1のセールスメール記録はemail_searchを使用。
includeStats=trueで開封率・クリック率等の送信統計も含まれる。`,
    {
      limit: z.number().min(1).max(100).optional().describe("取得件数（デフォルト20、最大100）"),
      after: z.string().optional().describe("ページネーション用カーソル"),
      archived: z.boolean().optional().describe("アーカイブ済みメールを含めるか（デフォルト false）"),
      type: z.string().optional().describe("メールタイプでフィルタ（REGULAR, AB_EMAIL, AUTOMATED_EMAIL, BLOG_EMAIL, BLOG_EMAIL_CHILD, FOLLOWUP_EMAIL, LOCALTIME, OPTIN_EMAIL, OPTIN_FOLLOWUP_EMAIL, RESUBSCRIBE_EMAIL, RSS_EMAIL, RSS_EMAIL_CHILD, SINGLE_SEND_API, SMTP_TOKEN, LEADFLOW_EMAIL, FEEDBACK_CES_EMAIL, FEEDBACK_NPS_EMAIL, FEEDBACK_CUSTOM_EMAIL, TICKET_EMAIL）"),
      createdAfter: z.string().optional().describe("この日時以降に作成されたメールのみ（ISO8601形式）"),
      createdBefore: z.string().optional().describe("この日時以前に作成されたメールのみ（ISO8601形式）"),
      updatedAfter: z.string().optional().describe("この日時以降に更新されたメールのみ（ISO8601形式）"),
      updatedBefore: z.string().optional().describe("この日時以前に更新されたメールのみ（ISO8601形式）"),
      includeStats: z.boolean().optional().describe("送信統計（opens, clicks, bounces, unsubscribes等）を含めるか（デフォルト false）"),
    
      pretty: prettyParam,
},
    async ({ limit, after, archived, type, createdAfter, createdBefore, updatedAfter, updatedBefore, includeStats, pretty }) => {
      try {
        const params = new URLSearchParams();
        if (limit) params.set("limit", String(limit));
        if (after) params.set("after", after);
        if (archived !== undefined) params.set("archived", String(archived));
        if (type) params.set("type", type);
        if (createdAfter) params.set("createdAfter", createdAfter);
        if (createdBefore) params.set("createdBefore", createdBefore);
        if (updatedAfter) params.set("updatedAfter", updatedAfter);
        if (updatedBefore) params.set("updatedBefore", updatedBefore);
        if (includeStats) params.set("includeStats", "true");

        const qs = params.toString() ? `?${params.toString()}` : "";
        const result = await fetchJson<Record<string, unknown>>(
          `${BASE_URL}/marketing/v3/emails${qs}`,
          { method: "GET", headers: getHeaders() }
        );
        return { content: [{ type: "text" as const, text: formatToolResult(result, pretty) }] };
      } catch (error) {
        const message = error instanceof HubSpotError ? `HubSpot API エラー (${error.status}): ${error.message}` : String(error);
        return { content: [{ type: "text" as const, text: message }], isError: true };
      }
    }
  );
}
