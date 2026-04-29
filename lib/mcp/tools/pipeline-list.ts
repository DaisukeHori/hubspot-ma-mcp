import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { listPipelines } from "@/lib/hubspot/crm-client";
import { HubSpotError } from "@/lib/hubspot/errors";
import { formatToolResult, prettyParam } from "@/lib/mcp/utils/format-result";

export function registerPipelineList(server: McpServer) {
  server.tool(
    "pipeline_list",
    `HubSpot パイプライン一覧を取得する。Deals（営業パイプライン）または Tickets（サポートパイプライン）。
返却: 各パイプラインの id, label（表示名）, displayOrder, archived,
stages[]（ステージID, label, displayOrder, metadata）。
用途:
- deal_update / ticket_update で hs_pipeline / hs_pipeline_stage に渡すIDを確認
- 新規パイプライン作成前の重複チェック
- ステージの順序や設定を把握
公式: GET /crm/v3/pipelines/{objectType}`,
    {
      objectType: z.enum(["deals", "tickets"]).describe("オブジェクトタイプ（deals または tickets）"),
    
      pretty: prettyParam,
},
    async ({ objectType, pretty }) => {
      try {
        const result = await listPipelines(objectType);
        return { content: [{ type: "text" as const, text: formatToolResult(result, pretty) }] };
      } catch (error) {
        const message = error instanceof HubSpotError ? `HubSpot API エラー (${error.status}): ${error.message}` : String(error);
        return { content: [{ type: "text" as const, text: message }], isError: true };
      }
    }
  );
}
