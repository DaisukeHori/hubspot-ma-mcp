/**
 * workflow_batch_read ツール
 * 複数のワークフローをIDで一括取得する
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { batchReadFlows } from "@/lib/hubspot/client";
import { OBJECT_TYPE_LABELS } from "@/lib/hubspot/types";
import { HubSpotError } from "@/lib/hubspot/errors";

export function registerWorkflowBatchRead(server: McpServer) {
  server.registerTool(
    "workflow_batch_read",
    {
      title: "ワークフロー一括取得",
      description:
        "複数のワークフローをIDで一括取得する（最大100件まで）。" +
        "個別に workflow_get を呼ぶより効率的（往復削減）。" +
        "返却: 各ワークフローの id, name, isEnabled, objectTypeId, actions数 を一覧表示。" +
        "詳細（actions, enrollmentCriteria 等）は workflow_get で個別取得。" +
        "公式: POST /automation/v4/flows/batch/read（リクエストボディは inputs[].flowId と type:'FLOW_ID' が必須）",
      inputSchema: {
        flowIds: z
          .array(z.string())
          .min(1)
          .describe("ワークフローIDの配列"),
      },
    },
    async ({ flowIds }) => {
      try {
        const flows = await batchReadFlows(flowIds);

        if (flows.length === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: "指定されたIDに一致するワークフローが見つかりませんでした。",
              },
            ],
          };
        }

        const lines = flows.map((flow, index) => {
          const objectLabel =
            OBJECT_TYPE_LABELS[flow.objectTypeId] || flow.objectTypeId;
          const status = flow.isEnabled ? "✅ 有効" : "⏸ 無効";
          return `${index + 1}. **${flow.name}**\n   ID: ${flow.id} | ${status} | 対象: ${objectLabel} | アクション数: ${flow.actions?.length ?? 0}`;
        });

        const text = [
          `ワークフロー一括取得結果 (${flows.length}/${flowIds.length}件):`,
          "",
          ...lines,
        ].join("\n\n");

        return {
          content: [{ type: "text" as const, text }],
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
