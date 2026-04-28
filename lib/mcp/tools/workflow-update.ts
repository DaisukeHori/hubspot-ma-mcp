/**
 * workflow_update ツール
 * 既存ワークフローを更新する（revisionId は自動取得）
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { updateFlow } from "@/lib/hubspot/client";
import { OBJECT_TYPE_LABELS } from "@/lib/hubspot/types";
import { HubSpotError } from "@/lib/hubspot/errors";

export function registerWorkflowUpdate(server: McpServer) {
  server.registerTool(
    "workflow_update",
    {
      title: "ワークフロー更新",
      description:
        "既存ワークフローを更新する（PUT=全体置換）。" +
        "サーバ側でまず GET /automation/v4/flows/{flowId} で現在のflowを取得し、" +
        "createdAt/updatedAt を除去 → updates をマージ → revisionId を維持して PUT。" +
        "更新可能: name（名前変更）, isEnabled（有効/無効切り替え）, actions（アクション配列）, " +
        "enrollmentCriteria（トリガー条件）, associations 等。" +
        "PUT のため、actions を渡す場合は省略したアクションは削除される点に注意。" +
        "公式: PUT /automation/v4/flows/{flowId}",
      inputSchema: {
        flowId: z.string().describe("更新対象のワークフローID"),
        updates: z
          .record(z.string(), z.unknown())
          .describe(
            "更新内容のオブジェクト。例: { name: '新しい名前', isEnabled: true }"
          ),
      },
    },
    async ({ flowId, updates }) => {
      try {
        const flow = await updateFlow(flowId, updates);

        const objectLabel =
          OBJECT_TYPE_LABELS[flow.objectTypeId] || flow.objectTypeId;
        const status = flow.isEnabled ? "✅ 有効" : "⏸ 無効";

        const text = [
          `ワークフローを更新しました。`,
          "",
          `- **名前:** ${flow.name}`,
          `- **ID:** ${flow.id}`,
          `- **状態:** ${status}`,
          `- **対象:** ${objectLabel}`,
          `- **新リビジョン:** ${flow.revisionId}`,
        ].join("\n");

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
