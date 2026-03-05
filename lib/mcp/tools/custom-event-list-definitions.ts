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

export function registerCustomEventListDefinitions(server: McpServer) {
  server.tool(
    "custom_event_list_definitions",
    `HubSpot カスタムイベント定義一覧を取得する。アカウントで定義済みの全カスタムイベントを確認。

返却: イベント定義の配列（fullyQualifiedName, name, label, primaryObject, propertyDefinitions等）。
fullyQualifiedNameをcustom_event_sendのeventNameパラメータに使用。`,
    {
      searchString: z.string().optional().describe("イベント名でフィルタ（部分一致）"),
    },
    async ({ searchString }) => {
      try {
        const params = new URLSearchParams();
        if (searchString) params.set("searchString", searchString);
        const qs = params.toString() ? `?${params.toString()}` : "";

        const result = await fetchJson<Record<string, unknown>>(
          `${BASE_URL}/events/v3/event-definitions${qs}`,
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
