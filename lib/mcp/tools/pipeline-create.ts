import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createPipeline } from "../../hubspot/crm-client";

export function registerPipelineCreate(server: McpServer) {
  server.tool(
    "pipeline_create",
    "取引またはチケットのパイプラインを新規作成する",
    {
      objectType: z.enum(["deals", "tickets"]).describe("deals または tickets"),
      label: z.string().describe("パイプライン名"),
      displayOrder: z.number().optional().describe("表示順（デフォルト: 0）"),
      stages: z.array(z.object({
        label: z.string().describe("ステージ名"),
        displayOrder: z.number().describe("表示順"),
        metadata: z.record(z.string()).optional().describe("メタデータ（例: { \"probability\": \"0.5\", \"isClosed\": \"false\" }）"),
      })).describe("ステージ定義"),
    },
    async ({ objectType, label, displayOrder, stages }) => {
      const stagesWithMeta = stages.map(s => ({
        ...s,
        metadata: s.metadata || {},
      }));
      const result = await createPipeline(objectType, label, displayOrder ?? 0, stagesWithMeta);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );
}
