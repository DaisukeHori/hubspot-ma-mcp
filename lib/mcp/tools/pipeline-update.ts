import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { updatePipeline } from "../../hubspot/crm-client";

export function registerPipelineUpdate(server: McpServer) {
  server.tool(
    "pipeline_update",
    "パイプラインのラベル・ステージを更新する",
    {
      objectType: z.enum(["deals", "tickets"]).describe("deals または tickets"),
      pipelineId: z.string().describe("パイプライン ID"),
      label: z.string().optional().describe("新しいラベル"),
      displayOrder: z.number().optional().describe("新しい表示順"),
      stages: z.array(z.object({
        id: z.string().optional().describe("既存ステージ ID（更新時）"),
        label: z.string().describe("ステージ名"),
        displayOrder: z.number().describe("表示順"),
        metadata: z.record(z.string()).optional().describe("メタデータ"),
      })).optional().describe("ステージ定義（全置換）"),
    },
    async ({ objectType, pipelineId, label, displayOrder, stages }) => {
      const updates: Record<string, unknown> = {};
      if (label !== undefined) updates.label = label;
      if (displayOrder !== undefined) updates.displayOrder = displayOrder;
      if (stages !== undefined) updates.stages = stages.map(s => ({ ...s, metadata: s.metadata || {} }));
      const result = await updatePipeline(objectType, pipelineId, updates as Parameters<typeof updatePipeline>[2]);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );
}
