/**
 * workflow_clone ツール
 * 既存ワークフローを複製する（GET → strip → POST のヘルパー）
 *
 * 用途:
 *  - LINE QR WFの月次バリエーション作成（テンプレートから新月版を量産）
 *  - 同じロジックの別WFを作る場合の雛形コピー
 *  - 危険な変更を加える前にバックアップとして複製
 *
 * 動作:
 *  ① workflow_get(sourceFlowId) で完全な定義を取得
 *  ② 読み取り専用フィールド（id, revisionId, createdAt, updatedAt, migrationStatus）を除去
 *  ③ overrides をマージ（newName は最優先で上書き）
 *  ④ workflow_create と同じ POST /automation/v4/flows で新WFを作成
 *
 * 安全策:
 *  - 複製先 WF は **デフォルトで isEnabled=false**（うっかり本番起動を防ぐ）
 *  - overrides で isEnabled: true を明示的に指定すれば有効化された状態で作成可能
 *  - source WF には一切影響なし（read-only 操作）
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { cloneFlow } from "@/lib/hubspot/client";
import { OBJECT_TYPE_LABELS } from "@/lib/hubspot/types";
import { HubSpotError } from "@/lib/hubspot/errors";

export function registerWorkflowClone(server: McpServer) {
  server.registerTool(
    "workflow_clone",
    {
      title: "ワークフロー複製",
      description:
        "既存ワークフローを複製して新しい WF を作成する。" +
        "内部的には workflow_get → 読み取り専用フィールド除去 → workflow_create の流れで動く。" +
        "" +
        "【典型的な用途】" +
        "- LINE QR WFの月次バリエーション作成（テンプレートからリネームして量産）" +
        "- 同じロジックの別 WF を作る場合の雛形コピー" +
        "- 危険な変更を加える前にバックアップとして複製" +
        "" +
        "【安全策】" +
        "複製先 WF は **デフォルトで isEnabled=false** で作成される（うっかり本番起動防止）。" +
        "overrides で { isEnabled: true } を明示すれば有効化された状態で作成可能。" +
        "" +
        "【source 側への影響】" +
        "なし（read-only 操作）。複製は完全に独立した別 WF として作成される。",
      inputSchema: {
        sourceFlowId: z
          .string()
          .describe("複製元のワークフロー ID（例: '592475833' = 入門講座 LINE QR WF テンプレート）"),
        newName: z
          .string()
          .describe(
            "新しい WF の名前（例: '☆2026.06.11event.revol.co.jp_LINEカスタムQRコードプロパティ値の設定'）"
          ),
        overrides: z
          .record(z.string(), z.unknown())
          
          .optional()
          .describe(
            "上書きしたいフィールドのオブジェクト。例: { isEnabled: true, description: '新説明' }。" +
            "actions や enrollmentCriteria を上書きすれば、構造を変えた複製も作れる。" +
            "isEnabled はデフォルト false（事故防止）。明示的に true を渡せば有効化される。"
          ),
      },
    },
    async ({ sourceFlowId, newName, overrides }) => {
      try {
        const flow = await cloneFlow(sourceFlowId, newName, overrides);

        const objectLabel =
          OBJECT_TYPE_LABELS[flow.objectTypeId] || flow.objectTypeId;
        const status = flow.isEnabled ? "✅ 有効" : "⏸ 無効";

        const text = [
          `ワークフローを複製しました。`,
          "",
          `- **複製元:** ${sourceFlowId}`,
          `- **新WF名:** ${flow.name}`,
          `- **新WF ID:** ${flow.id}`,
          `- **状態:** ${status}`,
          `- **タイプ:** ${flow.type}`,
          `- **対象:** ${objectLabel} (${flow.objectTypeId})`,
          `- **リビジョン:** ${flow.revisionId}`,
          `- **アクション数:** ${flow.actions?.length ?? 0}`,
          "",
          `🔗 https://app.hubspot.com/workflows/{portalId}/platform/flow/${flow.id}/edit`,
          "",
          flow.isEnabled
            ? "⚠️ 複製先WFは **有効化された状態** で作成されました。意図しない動作に注意してください。"
            : "ℹ️ 複製先WFは **無効状態** で作成されました。動作確認後、UI または workflow_update で有効化してください。",
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
