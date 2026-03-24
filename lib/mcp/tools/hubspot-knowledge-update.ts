import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getHubSpotToken } from "@/lib/hubspot/auth-context";
import { HubSpotError } from "@/lib/hubspot/errors";

const BASE_URL = "https://api.hubapi.com";
const KNOWLEDGE_EMAIL = "mcp-knowledge-store@hubspot-ma.internal.revol.co.jp";

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

export function registerHubspotKnowledgeUpdate(server: McpServer) {
  server.tool(
    "hubspot_knowledge_update",
    `HubSpot Knowledge Store のナレッジを更新する。設計思想・命名規則・施策パターン等の暗黙知を保存・更新。

mode:
- replace: そのカテゴリの内容を丸ごと上書き（overview, naming, properties, workflows, patterns, guardrails向け）
- append: 既存内容の末尾に追記（history向け。施策実行後の記録追加に使用）

カテゴリ（12種）:
- design_decisions: 設計判断とその理由
- naming_conventions: 命名規則
- property_annotations: カスタムプロパティの注釈
- workflow_annotations: WFの注釈
- playbooks: 施策の実行手順書
- guardrails: 禁止事項
- history: 過去施策の記録
- contacts_segments: セグメント戦略
- brand_voice: トーン・文体
- integrations: 外部連携
- goals: KPI目標
- calendar: 施策カレンダー

施策実行後に「今回のパターンを記録して」と言われたら、historyにappendし、必要に応じてpatternsもreplaceで更新する。`,
    {
      category: z.enum(["design_decisions", "naming_conventions", "property_annotations", "workflow_annotations", "playbooks", "guardrails", "history", "contacts_segments", "brand_voice", "integrations", "goals", "calendar"])
        .describe("更新するカテゴリ"),
      content: z.string().describe("更新する内容（Markdown形式推奨）"),
      mode: z.enum(["replace", "append"]).describe("replace=丸ごと上書き, append=末尾に追記"),
    },
    async ({ category, content, mode }) => {
      try {
        const headers = getHeaders();

        // 既存ノート検索
        const result = await fetchJson<{ results: Array<{ id: string; properties: Record<string, string | null> }> }>(
          `${BASE_URL}/crm/v3/objects/notes/search`,
          {
            method: "POST",
            headers,
            body: JSON.stringify({
              filterGroups: [{ filters: [{ propertyName: "hs_note_body", operator: "CONTAINS_TOKEN", value: "MCP_KNOWLEDGE" }] }],
              properties: ["hs_note_body"],
              limit: 50,
            }),
          }
        );

        let targetNote: { id: string; body: string } | null = null;
        for (const note of result.results) {
          const body = note.properties.hs_note_body || "";
          if (body.includes(`[MCP_KNOWLEDGE:${category}]`)) {
            targetNote = { id: note.id, body };
            break;
          }
        }

        if (targetNote) {
          // 既存ノート更新
          let newBody: string;
          if (mode === "replace") {
            newBody = `[MCP_KNOWLEDGE:${category}]\n\n${content}`;
          } else {
            // append: タグ行はそのまま、末尾に追記
            const timestamp = new Date().toISOString().split("T")[0];
            newBody = `${targetNote.body}\n\n---\n[${timestamp}]\n${content}`;
          }

          await fetchJson<{ id: string }>(
            `${BASE_URL}/crm/v3/objects/notes/${targetNote.id}`,
            {
              method: "PATCH",
              headers,
              body: JSON.stringify({
                properties: {
                  hs_note_body: newBody,
                  hs_timestamp: new Date().toISOString(),
                },
              }),
            }
          );

          return {
            content: [{
              type: "text" as const,
              text: `ナレッジ「${category}」を${mode === "replace" ? "上書き更新" : "追記"}しました。（noteId: ${targetNote.id}）`,
            }],
          };
        } else {
          // ノートが存在しない → 新規作成（setupが先に必要だが、フォールバックとして作成）
          // コンタクト検索
          const contactResult = await fetchJson<{ total: number; results: Array<{ id: string }> }>(
            `${BASE_URL}/crm/v3/objects/contacts/search`,
            {
              method: "POST",
              headers,
              body: JSON.stringify({
                filterGroups: [{ filters: [{ propertyName: "email", operator: "EQ", value: KNOWLEDGE_EMAIL }] }],
                limit: 1,
              }),
            }
          );

          if (contactResult.total === 0) {
            return {
              content: [{
                type: "text" as const,
                text: "Knowledge Storeがセットアップされていません。先にhubspot_knowledge_setupを実行してください。",
              }],
              isError: true,
            };
          }

          const contactId = contactResult.results[0].id;
          const newNote = await fetchJson<{ id: string }>(
            `${BASE_URL}/crm/v3/objects/notes`,
            {
              method: "POST",
              headers,
              body: JSON.stringify({
                properties: {
                  hs_timestamp: new Date().toISOString(),
                  hs_note_body: `[MCP_KNOWLEDGE:${category}]\n\n${content}`,
                },
                associations: [
                  { to: { id: contactId }, types: [{ associationCategory: "HUBSPOT_DEFINED", associationTypeId: 202 }] },
                ],
              }),
            }
          );

          return {
            content: [{
              type: "text" as const,
              text: `ナレッジ「${category}」を新規作成しました。（noteId: ${newNote.id}）`,
            }],
          };
        }
      } catch (error) {
        const message = error instanceof HubSpotError ? `HubSpot API エラー (${error.status}): ${error.message}` : String(error);
        return { content: [{ type: "text" as const, text: message }], isError: true };
      }
    }
  );
}
