import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { crmGet } from "@/lib/hubspot/crm-client";
import { HubSpotError } from "@/lib/hubspot/errors";

export function registerNoteGet(server: McpServer) {
  server.tool(
    "note_get",
    "HubSpot メモの詳細を取得する。関連レコードの取得も可能。",
    {
      noteId: z.string().describe("メモのエンゲージメントID（数値文字列）。note_searchやnote_createの返却値のidフィールドから取得"),
      properties: z.array(z.string()).optional().describe("取得するプロパティ名の配列"),
      associations: z.array(z.string()).optional().describe("取得する関連オブジェクト（contacts, companies, deals 等）"),
    },
    async ({ noteId, properties, associations }) => {
      try {
        const defaultProps = properties ?? [
          "hs_note_body", "hs_timestamp", "hubspot_owner_id",
          "hs_attachment_ids",
        ];
        const result = await crmGet("notes" as any, noteId, defaultProps, associations);
        return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
      } catch (error) {
        const message = error instanceof HubSpotError ? `HubSpot API エラー (${error.status}): ${error.message}` : String(error);
        return { content: [{ type: "text" as const, text: message }], isError: true };
      }
    }
  );
}
