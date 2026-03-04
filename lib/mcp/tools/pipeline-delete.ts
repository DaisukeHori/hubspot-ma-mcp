import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { deletePipeline } from "@/lib/hubspot/crm-client";

export function registerPipelineDelete(server: McpServer) {
  server.tool(
    "pipeline_delete",
    `HubSpot パイプラインを削除する。confirm=trueが必須。

注意: デフォルトパイプラインは削除不可。削除するとパイプライン内の取引/チケットは別パイプラインに移動される場合がある。`,
    {
      objectType: z.enum(["deals", "tickets"]).describe("deals または tickets"),
      pipelineId: z.string().describe("パイプラインID（pipeline_listで確認）"),
      confirm: z.boolean().describe("削除確認フラグ（trueを指定して実行。誤削除防止）"),
    },
    async ({ objectType, pipelineId, confirm }) => {
      if (!confirm) return { content: [{ type: "text" as const, text: "confirm=trueを指定してください" }] };
      await deletePipeline(objectType, pipelineId);
      return { content: [{ type: "text" as const, text: JSON.stringify({ deleted: true, pipelineId }) }] };
    }
  );
}
