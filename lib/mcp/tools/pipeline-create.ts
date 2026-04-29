import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createPipeline } from "../../hubspot/crm-client";
import { formatToolResult, prettyParam } from "@/lib/mcp/utils/format-result";

export function registerPipelineCreate(server: McpServer) {
  server.tool(
    "pipeline_create",
    `HubSpot にパイプラインを新規作成する。取引（deals）またはチケット（tickets）用。ステージ定義が必須。

返却: 作成されたパイプラインのID, label, stages。`,
    {
      objectType: z.enum(["deals", "tickets"]).describe("deals または tickets"),
      label: z.string().describe("パイプライン名（例: '法人営業パイプライン'）"),
      displayOrder: z.number().optional().describe("表示順（デフォルト: 0）"),
      stages: z.array(z.object({
        label: z.string().describe("ステージ名"),
        displayOrder: z.number().describe("表示順"),
        metadata: z.record(z.string()).optional().describe("メタデータ（例: { \"probability\": \"0.5\", \"isClosed\": \"false\" }）"),
      })).describe("ステージ定義の配列。各要素: {label: ステージ名, displayOrder: 表示順, metadata:{probability: 成約確率0.0-1.0(deals必須), ticketState: OPEN/CLOSED(tickets用)}}"),
    
      pretty: prettyParam,
},
    async ({ objectType, label, displayOrder, stages, pretty }) => {
      const stagesWithMeta = stages.map(s => ({
        ...s,
        metadata: s.metadata || {},
      }));
      const result = await createPipeline(objectType, label, displayOrder ?? 0, stagesWithMeta);
      return { content: [{ type: "text", text: formatToolResult(result, pretty) }] };
    }
  );
}
