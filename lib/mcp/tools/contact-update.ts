import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { crmUpdate } from "@/lib/hubspot/crm-client";
import { HubSpotError } from "@/lib/hubspot/errors";

export function registerContactUpdate(server: McpServer) {
  server.tool(
    "contact_update",
    `HubSpot コンタクトのプロパティを更新する。指定したプロパティのみ上書き（未指定のプロパティは変更されない）。

プロパティ名はproperties_listツールで確認可能。emailの変更も可能だが重複チェックあり。`,
    {
      contactId: z.string().describe("コンタクト ID"),
      properties: z.record(z.string()).describe("更新するプロパティ（キー:値）"),
    },
    async ({ contactId, properties }) => {
      try {
        const result = await crmUpdate("contacts", contactId, properties);
        return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
      } catch (error) {
        const message = error instanceof HubSpotError ? `HubSpot API エラー (${error.status}): ${error.message}` : String(error);
        return { content: [{ type: "text" as const, text: message }], isError: true };
      }
    }
  );
}
