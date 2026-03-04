import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { crmUpdate } from "@/lib/hubspot/crm-client";
import { HubSpotError } from "@/lib/hubspot/errors";

export function registerNoteUpdate(server: McpServer) {
  server.tool(
    "note_update",
    `HubSpot メモのプロパティを更新する。主なプロパティ: hs_note_body（本文HTML）, hs_timestamp（タイムスタンプ）。指定したプロパティのみ上書き。`,
    {
      noteId: z.string().describe("メモのエンゲージメントID（数値文字列）。note_searchやnote_createの返却値のidフィールドから取得"),
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
