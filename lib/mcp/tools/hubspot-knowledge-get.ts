import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getHubSpotToken } from "@/lib/hubspot/auth-context";
import { HubSpotError } from "@/lib/hubspot/errors";

const BASE_URL = "https://api.hubapi.com";

async function fetchJson<T>(url: string, options: RequestInit): Promise<T> {
  const response = await fetch(url, options);
  if (!response.ok) {
    let message = response.statusText;
    try { const body = await response.json(); message = body.message || JSON.stringify(body); } catch { /* ignore */ }
    throw new HubSpotError(response.status, message);
  }
  return response.json() as Promise<T>;
}

function getHeaders(): Record<string, string> {
  return { Authorization: `Bearer ${getHubSpotToken()}`, "Content-Type": "application/json" };
}

export function registerHubspotKnowledgeGet(server: McpServer) {
  server.tool(
    "hubspot_knowledge_get",
    `HubSpot Knowledge Store からナレッジを取得する。AIがMA担当者として「うちのやり方」を理解するための知識ベース。

会話の冒頭でcategory省略で全件取得し、設計思想・命名規則・パターン・禁止事項を把握することを推奨。

カテゴリ（12種）:
- design_decisions: 設計判断とその理由
- naming_conventions: 命名規則
- property_annotations: カスタムプロパティの注釈（用途・更新方法・触っていいか）
- workflow_annotations: WFの注釈（目的・依存関係・触っていいか）
- playbooks: 施策の実行手順書
- guardrails: 禁止事項・注意事項
- history: 過去施策の記録と学び
- contacts_segments: セグメント戦略
- brand_voice: トーン・文体ルール
- integrations: 外部連携・技術構成
- goals: KPI目標（数値目標・達成基準）
- calendar: 施策カレンダー（スケジュール・準備タスク）

返却: カテゴリ名をキー、内容を値としたオブジェクト。`,
    {
      category: z.enum(["design_decisions", "naming_conventions", "property_annotations", "workflow_annotations", "playbooks", "guardrails", "history", "contacts_segments", "brand_voice", "integrations", "goals", "calendar"]).optional()
        .describe(
          "取得するカテゴリ（12値）: " +
            "design_decisions=設計思想・なぜこの構成か / " +
            "naming_conventions=命名規則・接頭辞ルール / " +
            "property_annotations=プロパティ補足説明 / " +
            "workflow_annotations=ワークフロー補足説明 / " +
            "playbooks=施策パターン・手順 / " +
            "guardrails=禁止事項・触ってはいけない領域 / " +
            "history=過去の意思決定履歴 / " +
            "contacts_segments=ターゲットセグメント定義 / " +
            "brand_voice=コピーガイド・トーン&マナー / " +
            "integrations=連携システム情報 / " +
            "goals=KPI目標 / " +
            "calendar=施策カレンダー。" +
            "省略時は全カテゴリを一括取得"
        ),
    },
    async ({ category }) => {
      try {
        const headers = getHeaders();

        // MCP_KNOWLEDGEタグ付きノートを検索
        const searchBody: Record<string, unknown> = {
          filterGroups: [{ filters: [{ propertyName: "hs_note_body", operator: "CONTAINS_TOKEN", value: "MCP_KNOWLEDGE" }] }],
          properties: ["hs_note_body", "hs_timestamp"],
          limit: 50,
        };

        const result = await fetchJson<{ results: Array<{ id: string; properties: Record<string, string | null> }> }>(
          `${BASE_URL}/crm/v3/objects/notes/search`,
          { method: "POST", headers, body: JSON.stringify(searchBody) }
        );

        const knowledge: Record<string, { content: string; noteId: string; updatedAt: string }> = {};

        for (const note of result.results) {
          const body = note.properties.hs_note_body || "";
          const match = body.match(/\[MCP_KNOWLEDGE:(\w+)\]/);
          if (!match) continue;

          const cat = match[1];
          if (category && cat !== category) continue;

          // タグ行を除いた本文を取得
          const content = body.replace(/\[MCP_KNOWLEDGE:\w+\]\n*/, "").trim();
          knowledge[cat] = {
            content,
            noteId: note.id,
            updatedAt: note.properties.hs_timestamp || "",
          };
        }

        if (Object.keys(knowledge).length === 0) {
          return {
            content: [{
              type: "text" as const,
              text: category
                ? `カテゴリ「${category}」のナレッジが見つかりません。hubspot_knowledge_setupを実行してください。`
                : "ナレッジが見つかりません。hubspot_knowledge_setupを実行してセットアップしてください。",
            }],
          };
        }

        return {
          content: [{ type: "text" as const, text: JSON.stringify(knowledge, null, 2) }],
        };
      } catch (error) {
        const message = error instanceof HubSpotError ? `HubSpot API エラー (${error.status}): ${error.message}` : String(error);
        return { content: [{ type: "text" as const, text: message }], isError: true };
      }
    }
  );
}
