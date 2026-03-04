/**
 * workflow_create ツール
 * 新しいワークフローを作成する
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createFlow } from "@/lib/hubspot/client";
import { OBJECT_TYPE_LABELS } from "@/lib/hubspot/types";
import { HubSpotError } from "@/lib/hubspot/errors";

export function registerWorkflowCreate(server: McpServer) {
  server.registerTool(
    "workflow_create",
    {
      title: "ワークフロー作成",
      description:
        "新しいワークフローを作成する。デフォルトでは無効状態で作成される。" +
        "コンタクトベースのワークフローは type='CONTACT_FLOW'、" +
        "それ以外（会社、取引、チケット）は type='PLATFORM_FLOW' を使用する。",
      inputSchema: {
        name: z.string().describe("ワークフロー名"),
        type: z
          .enum(["CONTACT_FLOW", "PLATFORM_FLOW"])
          .describe(
            "ワークフロータイプ。コンタクト=CONTACT_FLOW、それ以外=PLATFORM_FLOW"
          ),
        objectTypeId: z
          .string()
          .describe(
            "対象オブジェクトタイプID。0-1=コンタクト, 0-2=会社, 0-3=取引, 0-5=チケット"
          ),
        isEnabled: z
          .boolean()
          .optional()
          .describe("有効化するか（デフォルト: false）"),
        actions: z
          .array(z.record(z.string(), z.unknown()))
          .optional()
          .describe("アクション定義の配列（オプション）"),
        enrollmentCriteria: z
          .record(z.string(), z.unknown())
          .optional()
          .describe("トリガー条件（オプション）"),
      },
    },
    async ({ name, type, objectTypeId, isEnabled, actions, enrollmentCriteria }) => {
      try {
        const flow = await createFlow({
          name,
          type,
          objectTypeId,
          isEnabled,
          actions,
          enrollmentCriteria,
        });

        const objectLabel =
          OBJECT_TYPE_LABELS[flow.objectTypeId] || flow.objectTypeId;
        const status = flow.isEnabled ? "✅ 有効" : "⏸ 無効";

        const text = [
          `ワークフローを作成しました。`,
          "",
          `- **名前:** ${flow.name}`,
          `- **ID:** ${flow.id}`,
          `- **状態:** ${status}`,
          `- **対象:** ${objectLabel}`,
          `- **リビジョン:** ${flow.revisionId}`,
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
