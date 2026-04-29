import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { crmGet } from "@/lib/hubspot/crm-client";
import { HubSpotError } from "@/lib/hubspot/errors";
import { formatToolResult, prettyParam } from "@/lib/mcp/utils/format-result";

export function registerNoteGet(server: McpServer) {
  server.tool(
    "note_get",
    `HubSpot メモ（Note エンゲージメント）の詳細を取得する。
返却: id, properties（hs_note_body=本文HTML, hs_timestamp=作成日時, hubspot_owner_id=作成者,
hs_attachment_ids=添付ファイルIDカンマ区切り）。
properties 省略時は主要プロパティのみ取得。
associations でコンタクト・会社・取引・チケット等の関連レコードIDを取得（例: ['contacts','deals']）。
公式: GET /crm/v3/objects/notes/{noteId}`,
    {
      noteId: z.string().describe("メモのエンゲージメントID（数値文字列）。note_searchやnote_createの返却値のidフィールドから取得"),
      properties: z.array(z.string()).optional().describe("取得するプロパティ名の配列"),
      associations: z.array(z.string()).optional().describe("取得する関連オブジェクト（contacts, companies, deals 等）"),
    
      pretty: prettyParam,
},
    async ({ noteId, properties, associations, pretty }) => {
      try {
        const defaultProps = properties ?? [
          "hs_note_body", "hs_timestamp", "hubspot_owner_id",
          "hs_attachment_ids",
        ];
        const result = await crmGet("notes" as any, noteId, defaultProps, associations);
        return { content: [{ type: "text" as const, text: formatToolResult(result, pretty) }] };
      } catch (error) {
        const message = error instanceof HubSpotError ? `HubSpot API エラー (${error.status}): ${error.message}` : String(error);
        return { content: [{ type: "text" as const, text: message }], isError: true };
      }
    }
  );
}
