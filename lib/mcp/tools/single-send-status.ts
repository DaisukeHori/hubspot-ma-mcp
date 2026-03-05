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

export function registerSingleSendStatus(server: McpServer) {
  server.tool(
    "single_send_status",
    `Single-Send API で送信したメールのステータスを確認する。

返却: status（PENDING/PROCESSING/CANCELED/COMPLETE）, sendResult（SENT/QUEUED/INVALID_TO_ADDRESS/BLOCKED_DOMAIN/PREVIOUSLY_BOUNCED/PREVIOUS_SPAM/INVALID_FROM_ADDRESS/MISSING_CONTENT/MISSING_TEMPLATE_PROPERTIES等）, requestedAt, startedAt, completedAt, eventId。`,
    {
      statusId: z.string().describe("single_send_emailの返却値のstatusIdフィールド"),
    },
    async ({ statusId }) => {
      try {
        const result = await fetchJson<Record<string, unknown>>(
          `${BASE_URL}/marketing/v3/email/send-statuses/${statusId}`,
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
