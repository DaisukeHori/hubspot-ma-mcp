import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { crmGet } from "@/lib/hubspot/crm-client";
import { HubSpotError } from "@/lib/hubspot/errors";
import { formatToolResult, prettyParam } from "@/lib/mcp/utils/format-result";

export function registerTicketGet(server: McpServer) {
  server.tool(
    "ticket_get",
    `HubSpot チケット（カスタマーサポート案件）の詳細を取得する。
返却: id, properties（subject, content, hs_pipeline, hs_pipeline_stage, hs_ticket_priority,
hubspot_owner_id, createdate, hs_lastmodifieddate 等）。
properties で取得するプロパティ名を指定（省略時は主要プロパティのみ）。
associations でコンタクト・会社・取引等の関連レコードIDを取得（例: ['contacts','companies','deals']）。
公式: GET /crm/v3/objects/tickets/{ticketId}`,
    {
      ticketId: z.string().describe("チケットレコードID（数値文字列）。ticket_searchやticket_createの返却値のidフィールドから取得"),
      properties: z.array(z.string()).optional().describe("取得するプロパティ名の配列"),
      associations: z.array(z.string()).optional().describe("取得する関連オブジェクト（contacts, companies, deals 等）"),
    
      pretty: prettyParam,
},
    async ({ ticketId, properties, associations, pretty }) => {
      try {
        const defaultProps = properties ?? [
          "subject", "content", "hs_pipeline", "hs_pipeline_stage",
          "hs_ticket_priority", "createdate", "hs_lastmodifieddate",
          "hubspot_owner_id",
        ];
        const result = await crmGet("tickets", ticketId, defaultProps, associations);
        return { content: [{ type: "text" as const, text: formatToolResult(result, pretty) }] };
      } catch (error) {
        const message = error instanceof HubSpotError ? `HubSpot API エラー (${error.status}): ${error.message}` : String(error);
        return { content: [{ type: "text" as const, text: message }], isError: true };
      }
    }
  );
}
