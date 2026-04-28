/**
 * workflow_list ツール
 * HubSpotアカウント内の全ワークフローを一覧取得する
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { listFlows } from "@/lib/hubspot/client";
import { OBJECT_TYPE_LABELS } from "@/lib/hubspot/types";
import { HubSpotError } from "@/lib/hubspot/errors";

export function registerWorkflowList(server: McpServer) {
  server.registerTool(
    "workflow_list",
    {
      title: "ワークフロー一覧取得",
      description:
        "HubSpotアカウント内の全ワークフロー（Automation v4 flows）を一覧取得する。" +
        "返却: 各ワークフローの id, name, isEnabled（有効/無効）, " +
        "objectTypeId（対象オブジェクト 0-1=コンタクト, 0-2=会社, 0-3=取引, 0-5=チケット）, actions数。" +
        "詳細を取得するには workflow_get または workflow_batch_read を使用。" +
        "ID指定で更新: workflow_update。複製・編集の元として使う。" +
        "公式: GET /automation/v4/flows",
      inputSchema: {},
    },
    async () => {
      try {
        const flows = await listFlows();

        if (flows.length === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: "ワークフローが見つかりませんでした。HubSpotアカウントにワークフローが存在するか確認してください。",
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

        const text = `ワークフロー一覧 (${flows.length}件):\n\n${lines.join("\n\n")}`;

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
