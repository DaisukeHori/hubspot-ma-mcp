import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { crmUpdate } from "@/lib/hubspot/crm-client";
import { HubSpotError } from "@/lib/hubspot/errors";

export function registerNoteUpdate(server: McpServer) {
  server.tool(
    "note_update",
    "HubSpot メモを更新する。",
    {
      noteId: z.string().describe("メモ ID"),
      properties: z.record(z.string()).describe("更新するプロパティ（hs_note_body, hs_timestamp 等）"),
    },
    async ({ noteId, properties }) => {
      try {
        const result = await crmUpdate("notes" as any, noteId, properties);
        return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
      } catch (error) {
        const message = error instanceof HubSpotError ? `HubSpot API エラー (${error.status}): ${error.message}` : String(error);
        return { content: [{ type: "text" as const, text: message }], isError: true };
      }
    }
  );
}
