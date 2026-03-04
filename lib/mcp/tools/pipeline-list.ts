import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { listPipelines } from "@/lib/hubspot/crm-client";
import { HubSpotError } from "@/lib/hubspot/errors";

export function registerPipelineList(server: McpServer) {
  server.tool(
    "pipeline_list",
    "HubSpot パイプライン一覧を取得する（Deals または Tickets）。ステージ情報も含む。",
    {
      objectType: z.enum(["deals", "tickets"]).describe("オブジェクトタイプ（deals または tickets）"),
    },
    async ({ objectType }) => {
      try {
        const result = await listPipelines(objectType);
        return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
      } catch (error) {
        const message = error instanceof HubSpotError ? `HubSpot API エラー (${error.status}): ${error.message}` : String(error);
        return { content: [{ type: "text" as const, text: message }], isError: true };
      }
    }
  );
}
