/**
 * workflow_delete ツール
 * ワークフローを削除する（復元不可）
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { deleteFlow, getFlow } from "@/lib/hubspot/client";
import { OBJECT_TYPE_LABELS } from "@/lib/hubspot/types";
import { HubSpotError } from "@/lib/hubspot/errors";

export function registerWorkflowDelete(server: McpServer) {
  server.registerTool(
    "workflow_delete",
    {
      title: "ワークフロー削除",
      description:
        "⚠️ ワークフローを完全削除する。この操作は取り消し不可で、復元にはHubSpotサポートへの連絡が必要。" +
        "他のCRUDツール（contact_delete, deal_delete 等の'ゴミ箱に移動して30日保持'）と異なり、" +
        "ワークフロー削除は即時かつ復元不能。" +
        "confirm=true を必ず指定（false/省略時は拒否）。" +
        "削除前に workflow_get で内容を必ず確認すること。" +
        "公式: DELETE /automation/v4/flows/{flowId}",
      inputSchema: {
        flowId: z.string().describe("削除対象のワークフローID"),
        confirm: z
          .boolean()
          .describe("削除確認フラグ。true でないと実行しない"),
      },
    },
    async ({ flowId, confirm }) => {
      // 安全策: confirm が true でない場合は拒否
      if (confirm !== true) {
        return {
          content: [
            {
              type: "text" as const,
              text: "削除はキャンセルされました。削除を実行するには confirm=true を指定してください。",
            },
          ],
        };
      }

      try {
        // 削除前にワークフロー情報を取得（確認用）
        const flow = await getFlow(flowId);
        const objectLabel =
          OBJECT_TYPE_LABELS[flow.objectTypeId] || flow.objectTypeId;

        // 削除実行
        await deleteFlow(flowId);

        const text = [
          `ワークフローを削除しました。`,
          "",
          `- **名前:** ${flow.name}`,
          `- **ID:** ${flow.id}`,
          `- **対象:** ${objectLabel}`,
          "",
          `⚠️ この操作は復元できません。復元が必要な場合は HubSpot サポートに連絡してください。`,
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
