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

export function registerMarketingEmailUpdate(server: McpServer) {
  server.tool(
    "marketing_email_update",
    `HubSpot マーケティングメールを部分更新する（PATCH）。件名・本文・送信者・配信リスト等を変更可能。

指定したフィールドのみ更新される（未指定フィールドは変更されない）。
DRAFT状態のメールのみ更新可能。PUBLISHED/SENT状態のメールを編集するには先にcloneして新しいDRAFTを作成する。`,
    {
      emailId: z.string().describe("マーケティングメールID（数値文字列）"),
      properties: z.record(z.unknown()).describe("更新するプロパティ（JSON）。主要フィールド: name(内部名), subject(件名), from(送信者), to(配信対象), content(本文widget構造)"),
    },
    async ({ emailId, properties }) => {
      try {
        const result = await fetchJson<Record<string, unknown>>(
          `${BASE_URL}/marketing/v3/emails/${emailId}`,
          { method: "PATCH", headers: getHeaders(), body: JSON.stringify(properties) }
        );
        return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
      } catch (error) {
        const message = error instanceof HubSpotError ? `HubSpot API エラー (${error.status}): ${error.message}` : String(error);
        return { content: [{ type: "text" as const, text: message }], isError: true };
      }
    }
  );
}
