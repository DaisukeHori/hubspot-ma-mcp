/**
 * workflow_create ツール
 * 新しいワークフローを作成する（基本作成 + 既存WF複製の両用途に対応）
 *
 * 用途:
 *  - スクラッチ作成: name + type + objectTypeId だけで空のWFを作る
 *  - 完全複製: workflow_get の出力（読み取り専用フィールドを除いた全フィールド）を渡す
 *  - テンプレート複製: workflow_clone ツールを使う方が簡単（このツールを内部で呼ぶ）
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
        "新しいワークフローを作成する（POST /automation/v4/flows）。" +
        "デフォルトでは無効状態（isEnabled=false）で作成される。" +
        "コンタクトベースのWFは type='CONTACT_FLOW'、それ以外（会社/取引/チケット）は type='PLATFORM_FLOW' を使用し、" +
        "objectTypeId で対象オブジェクトを指定する（0-1=コンタクト, 0-2=会社, 0-3=取引, 0-5=チケット）。" +
        "" +
        "【完全コピー用途】既存WF を複製したい場合は workflow_clone ツールが便利（内部で workflow_get → strip → 本ツールを呼ぶ）。" +
        "本ツールに直接 workflow_get の出力をそのまま渡すこともできる（読み取り専用フィールド: id, revisionId, createdAt, updatedAt, migrationStatus は HubSpot 側で無視される）。" +
        "" +
        "【隠れ仕様】" +
        "actions[] の actionId は WF 内部の連番識別子で、複製時に source と同じ値を使っても新WFは別 flowId なので衝突しない。" +
        "nextAvailableActionId は actions[] の最大 actionId + 1 にしておくのが安全（省略時は HubSpot が自動計算）。",
      inputSchema: {
        // ── 必須 ──
        name: z.string().describe("ワークフロー名（例: '新規リード自動フォロー'、'☆2026.06.11event.revol.co.jp_LINEカスタムQRコード'）"),
        type: z
          .enum(["CONTACT_FLOW", "PLATFORM_FLOW"])
          .describe(
            "ワークフロータイプ。コンタクト対象=CONTACT_FLOW、それ以外（会社/取引/チケット/カスタムオブジェクト）=PLATFORM_FLOW"
          ),
        objectTypeId: z
          .string()
          .describe(
            "対象オブジェクトタイプID。0-1=コンタクト, 0-2=会社, 0-3=取引, 0-5=チケット、その他カスタムオブジェクトは properties_list で確認可能"
          ),

        // ── 基本オプション ──
        isEnabled: z
          .boolean()
          .optional()
          .describe("有効化するか（デフォルト: false。事故防止のため、複製時は false 推奨）"),
        description: z
          .string()
          .optional()
          .describe("WF の説明文（HubSpot UI 上で表示される）"),

        // ── アクション・トリガー ──
        actions: z
          .array(z.record(z.string(), z.unknown()))
          .optional()
          .describe(
            "アクション定義の配列。各要素は actionTypeId / actionId / connection / fields を含む完全な action オブジェクト。" +
            "workflow_get の actions[] をそのまま渡せる。"
          ),
        enrollmentCriteria: z
          .record(z.string(), z.unknown())
          
          .optional()
          .describe(
            "エンロール条件（トリガー）。shouldReEnroll, listMembershipBased, filterBased 等を含む。" +
            "workflow_get の enrollmentCriteria をそのまま渡せる。"
          ),
        startActionId: z
          .string()
          .optional()
          .describe("最初に実行されるアクションの actionId（actions[] が複数あるとき必須）"),
        nextAvailableActionId: z
          .string()
          .optional()
          .describe(
            "次に新規アクションを追加するときに使う actionId（連番管理用）。" +
            "省略時は HubSpot 側で自動計算される。複製時は actions[] の最大値+1 を渡すと安全。"
          ),

        // ── 高度な設定（既存WF複製時に重要）──
        customProperties: z
          .record(z.string(), z.unknown())
          
          .optional()
          .describe("カスタムプロパティ設定（複製時はそのまま渡す）"),
        connections: z
          .record(z.string(), z.unknown())
          
          .optional()
          .describe("アクション間の接続定義（分岐構造）"),
        associations: z
          .record(z.string(), z.unknown())
          
          .optional()
          .describe("関連レコードの連動設定"),
        segmentCriteria: z
          .record(z.string(), z.unknown())
          
          .optional()
          .describe("セグメントベースのエンロール条件"),
        goalCriteria: z
          .record(z.string(), z.unknown())
          
          .optional()
          .describe("ゴール（目標達成）条件"),
        reEnrollmentTriggersEnabled: z
          .boolean()
          .optional()
          .describe("再エンロールを有効化するか"),
        scheduling: z
          .record(z.string(), z.unknown())
          
          .optional()
          .describe("スケジューリング設定（営業時間制限等）"),
        timeWindows: z
          .array(z.unknown())
          .optional()
          .describe("実行可能な時間帯ウィンドウ"),
        blockedDates: z
          .array(z.unknown())
          .optional()
          .describe("実行不可日（祝日等）"),
        suppressionListIds: z
          .array(z.string())
          .optional()
          .describe("除外リストID配列（このリストに含まれるコンタクトは処理スキップ）"),
      },
    },
    async (input) => {
      try {
        // 必須3フィールド + オプション全部を CreateFlowInput としてそのまま渡す
        // CreateFlowInput の [key: string]: unknown により未知フィールドも通る
        const flow = await createFlow(input);

        const objectLabel =
          OBJECT_TYPE_LABELS[flow.objectTypeId] || flow.objectTypeId;
        const status = flow.isEnabled ? "✅ 有効" : "⏸ 無効";

        const text = [
          `ワークフローを作成しました。`,
          "",
          `- **名前:** ${flow.name}`,
          `- **ID:** ${flow.id}`,
          `- **状態:** ${status}`,
          `- **タイプ:** ${flow.type}`,
          `- **対象:** ${objectLabel} (${flow.objectTypeId})`,
          `- **リビジョン:** ${flow.revisionId}`,
          `- **アクション数:** ${flow.actions?.length ?? 0}`,
          "",
          `🔗 https://app.hubspot.com/workflows/{portalId}/platform/flow/${flow.id}/edit`,
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
