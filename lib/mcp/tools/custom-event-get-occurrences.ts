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

export function registerCustomEventGetOccurrences(server: McpServer) {
  server.tool(
    "custom_event_get_occurrences",
    `HubSpot カスタムイベントの発生データ（オカレンス）を取得する。特定のイベントタイプやレコードに紐づくイベント履歴を確認。

返却: イベントオカレンスの配列（id, eventType, objectType, objectId, occurredAt, properties等）。`,
    {
      eventType: z.string().optional().describe("イベントタイプ（fullyQualifiedName。例: 'pe12345_seminar_attendance'）。指定すると特定イベントのみ返る"),
      objectType: z.string().optional().describe("オブジェクトタイプ（例: 'contact'）。objectIdまたはobjectPropertyと組み合わせて使用"),
      objectId: z.string().optional().describe("レコードID（数値文字列）。特定コンタクト等のイベント履歴を取得"),
      occurredAfter: z.string().optional().describe("この日時以降のイベント（ISO8601形式）"),
      occurredBefore: z.string().optional().describe("この日時以前のイベント（ISO8601形式）"),
      limit: z.number().min(1).max(100).optional().describe("取得件数（デフォルト10）"),
      after: z.string().optional().describe("ページネーション用カーソル"),
      sort: z.string().optional().describe("ソート順。'-occurredAt'=新しい順（デフォルト）、'occurredAt'=古い順"),
      objectPropertyEmail: z.string().optional().describe("コンタクトのメールアドレスでイベント検索（objectType=contactと併用。objectIdの代わりにメールアドレスでフィルタ）"),
    },
    async ({ eventType, objectType, objectId, occurredAfter, occurredBefore, limit, after, sort, objectPropertyEmail }) => {
      try {
        const params = new URLSearchParams();
        if (eventType) params.set("eventType", eventType);
        if (objectType) params.set("objectType", objectType);
        if (objectId) params.set("objectId", objectId);
        if (occurredAfter) params.set("occurredAfter", occurredAfter);
        if (occurredBefore) params.set("occurredBefore", occurredBefore);
        if (limit) params.set("limit", String(limit));
        if (after) params.set("after", after);
        if (sort) params.set("sort", sort);
        if (objectPropertyEmail) params.set("objectProperty.email", objectPropertyEmail);
        const qs = params.toString() ? `?${params.toString()}` : "";

        const result = await fetchJson<Record<string, unknown>>(
          `${BASE_URL}/events/v3/events${qs}`,
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
