import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getHubSpotToken } from "@/lib/hubspot/auth-context";
import { HubSpotError } from "@/lib/hubspot/errors";

const BASE_URL = "https://api.hubapi.com";
const KNOWLEDGE_EMAIL = "mcp-knowledge@system.internal";
const CATEGORIES = ["design_decisions", "naming_conventions", "property_annotations", "workflow_annotations", "playbooks", "guardrails", "history", "contacts_segments", "brand_voice", "integrations", "goals", "calendar"];

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

export function registerHubspotKnowledgeSetup(server: McpServer) {
  server.tool(
    "hubspot_knowledge_setup",
    `HubSpot Knowledge Store の初回セットアップを行う。AIがMA担当者として機能するための「暗黙知」保存基盤を構築する。

実行内容:
1. 専用コンタクト（mcp-knowledge@system.internal）を作成（既存なら再利用）
2. 7カテゴリの空ナレッジノートを作成

カテゴリ（12種）:
- design_decisions: アカウント全体の設計判断とその理由（なぜパイプラインをこう使うか、なぜチケットを使わないか等）
- naming_conventions: 命名規則（WF・フォーム・リスト・メール・プロパティ・キャンペーン）
- property_annotations: カスタムプロパティの注釈（用途・更新方法・触っていいか・依存先）
- workflow_annotations: ワークフローの注釈（目的・テンプレートか個別か・依存関係・触っていいか）
- playbooks: 施策の実行手順書（セミナー・ニュースレター・オンボーディング等の標準手順）
- guardrails: 禁止事項・注意事項（削除禁止リスト・変更禁止ステージ・配信頻度制限等）
- history: 過去施策の記録と学び（日付・施策名・結果・改善点）
- contacts_segments: セグメント戦略（主要セグメント定義・施策との対応・リスト依存関係）
- brand_voice: コミュニケーションのトーン・文体（件名フォーマット・本文トーン・禁止表現・CTA定型）
- integrations: 外部連携・技術的な構成メモ（連携ツール・API設定・データフロー）
- goals: マーケティングKPI目標（四半期/月次の数値目標・達成基準）
- calendar: 施策カレンダー（月単位のスケジュール・準備タスク）

セットアップ済みの場合はスキップされる。2回目以降は安全に実行可能。`,
    {},
    async () => {
      try {
        const headers = getHeaders();

        // 1. コンタクト検索
        const searchResult = await fetchJson<{ total: number; results: Array<{ id: string }> }>(
          `${BASE_URL}/crm/v3/objects/contacts/search`,
          {
            method: "POST",
            headers,
            body: JSON.stringify({
              filterGroups: [{ filters: [{ propertyName: "email", operator: "EQ", value: KNOWLEDGE_EMAIL }] }],
              properties: ["email", "firstname", "lastname"],
              limit: 1,
            }),
          }
        );

        let contactId: string;

        if (searchResult.total > 0) {
          contactId = searchResult.results[0].id;
        } else {
          // コンタクト作成
          const newContact = await fetchJson<{ id: string }>(
            `${BASE_URL}/crm/v3/objects/contacts`,
            {
              method: "POST",
              headers,
              body: JSON.stringify({
                properties: {
                  email: KNOWLEDGE_EMAIL,
                  firstname: "MCP Knowledge",
                  lastname: "Store",
                  lifecyclestage: "other",
                },
              }),
            }
          );
          contactId = newContact.id;
        }

        // 2. 既存ノート確認
        const notesResult = await fetchJson<{ results: Array<{ id: string; properties: Record<string, string | null> }> }>(
          `${BASE_URL}/crm/v3/objects/notes/search`,
          {
            method: "POST",
            headers,
            body: JSON.stringify({
              filterGroups: [{ filters: [{ propertyName: "hs_note_body", operator: "CONTAINS_TOKEN", value: "MCP_KNOWLEDGE" }] }],
              properties: ["hs_note_body", "hs_timestamp"],
              limit: 50,
            }),
          }
        );

        const existingCategories = new Set<string>();
        for (const note of notesResult.results) {
          const body = note.properties.hs_note_body || "";
          const match = body.match(/\[MCP_KNOWLEDGE:(\w+)\]/);
          if (match) existingCategories.add(match[1]);
        }

        // 3. 不足カテゴリのノートを作成
        const created: string[] = [];
        const skipped: string[] = [];

        for (const cat of CATEGORIES) {
          if (existingCategories.has(cat)) {
            skipped.push(cat);
            continue;
          }

          const descriptions: Record<string, string> = {
            design_decisions: "アカウント全体の設計判断とその理由を記述。例: なぜパイプラインをこう使うか、なぜライフサイクルを3段階にしているか等。",
            naming_conventions: "WF・フォーム・リスト・メール・プロパティ・キャンペーンの命名規則とパターン例を記述。",
            property_annotations: "重要なカスタムプロパティの注釈を記述。プロパティ名ごとに: 用途、更新方法(手動/WF自動/API)、触っていいか(readonly/editable)、依存先。",
            workflow_annotations: "既存ワークフローの注釈を記述。WF名ごとに: 目的(1行)、テンプレートか個別か、依存関係(トリガーとなるフォーム等)、触っていいか。",
            playbooks: "施策の実行手順書を記述。セミナー・ニュースレター・オンボーディング等のタイプ別に、ステップ1〜Nと各ステップの理由・注意点。",
            guardrails: "禁止事項・注意事項を記述。削除禁止リスト/WF/プロパティ、変更禁止ステージ順序、配信頻度制限、除外ルール等。",
            history: "過去施策の記録を追記。日付、施策名、対象、使用アセット、結果(配信数/開封率/CTR)、学び(効果的だったこと/失敗/改善点)。",
            contacts_segments: "セグメント戦略を記述。主要セグメントの定義、どのセグメントにどの施策を打つか、リストの依存関係。",
            brand_voice: "コミュニケーションのトーン・文体ルールを記述。件名フォーマット、本文トーン、禁止表現、CTA定型文、フッター定型。",
            integrations: "外部連携・技術構成メモを記述。連携ツール一覧、API設定、データフロー、定期同期の仕組み等。",
            goals: "マーケティングKPI目標を記述。四半期/月次のリード獲得数、メール開封率、セミナー参加者数等の数値目標。目標に対する現在の進捗と達成基準。",
            calendar: "施策カレンダーを記述。月単位の施策スケジュール。セミナー日程、NL配信日、キャンペーン期間等の予定と準備タスク。",
          };

          await fetchJson<{ id: string }>(
            `${BASE_URL}/crm/v3/objects/notes`,
            {
              method: "POST",
              headers,
              body: JSON.stringify({
                properties: {
                  hs_timestamp: new Date().toISOString(),
                  hs_note_body: `[MCP_KNOWLEDGE:${cat}]\n\n${descriptions[cat]}\n\n（このノートはAI MA担当者のナレッジストアです。hubspot_knowledge_updateツールで更新してください。）`,
                },
                associations: [
                  {
                    to: { id: contactId },
                    types: [{ associationCategory: "HUBSPOT_DEFINED", associationTypeId: 202 }],
                  },
                ],
              }),
            }
          );
          created.push(cat);
        }

        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify({
              status: "success",
              contactId,
              contactEmail: KNOWLEDGE_EMAIL,
              categoriesCreated: created,
              categoriesSkipped: skipped,
              message: created.length > 0
                ? `セットアップ完了。${created.length}カテゴリを作成しました。hubspot_knowledge_updateで各カテゴリの内容を記述してください。`
                : "セットアップ済みです。全カテゴリが既に存在します。",
            }, null, 2),
          }],
        };
      } catch (error) {
        const message = error instanceof HubSpotError ? `HubSpot API エラー (${error.status}): ${error.message}` : String(error);
        return { content: [{ type: "text" as const, text: message }], isError: true };
      }
    }
  );
}
