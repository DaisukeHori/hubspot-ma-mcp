/**
 * workflow_get ツール
 * 指定したワークフローの全詳細を取得する
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getFlow } from "@/lib/hubspot/client";
import { OBJECT_TYPE_LABELS } from "@/lib/hubspot/types";
import { HubSpotError } from "@/lib/hubspot/errors";

export function registerWorkflowGet(server: McpServer) {
  server.registerTool(
    "workflow_get",
    {
      title: "ワークフロー詳細取得",
      description:
        "指定したワークフローの完全定義を取得する。" +
        "返却: id, name, isEnabled, objectTypeId, revisionId（更新時に必要）, " +
        "actions[]（各アクションの type, actionTypeId, fields, connection）, " +
        "enrollmentCriteria（トリガー条件）, dataSources, associations 等。" +
        "ワークフローを複製・編集するときは、まずこれで取得→構造を把握→workflow_update。" +
        "公式: GET /automation/v4/flows/{flowId}",
      inputSchema: {
        flowId: z.string().describe("ワークフローID"),
      },
    },
    async ({ flowId }) => {
      try {
        const flow = await getFlow(flowId);

        const objectLabel =
          OBJECT_TYPE_LABELS[flow.objectTypeId] || flow.objectTypeId;
        const status = flow.isEnabled ? "✅ 有効" : "⏸ 無効";

        const summary = [
          `## ${flow.name}`,
          "",
          `- **ID:** ${flow.id}`,
          `- **状態:** ${status}`,
          `- **タイプ:** ${flow.type}`,
          `- **対象:** ${objectLabel} (${flow.objectTypeId})`,
          `- **リビジョン:** ${flow.revisionId}`,
          `- **作成日:** ${flow.createdAt}`,
          `- **更新日:** ${flow.updatedAt}`,
          `- **アクション数:** ${flow.actions?.length ?? 0}`,
          "",
          "### 詳細データ (JSON)",
          "```json",
          JSON.stringify(flow, null, 2),
          "```",
        ].join("\n");

        return {
          content: [{ type: "text" as const, text: summary }],
        };
      } catch (error) {
        const message =
          error instanceof HubSpotError
            ? error.toUserMessage()
            : `予期しないエラー: ${error instanceof Error ? error.message : String(error)}`;

        return {
          content: [{ type: "text" as const, text: `エラー: ${message}` }],
          isError: true,
        };
      }
    }
  );
}
