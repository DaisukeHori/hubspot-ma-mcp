import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getHubSpotToken } from "@/lib/hubspot/auth-context";
import { HubSpotError } from "@/lib/hubspot/errors";

const BASE_URL = "https://api.hubapi.com";
const KNOWLEDGE_EMAIL = "mcp-knowledge@system.internal";
const CATEGORIES = ["overview", "naming", "properties", "workflows", "patterns", "guardrails", "history"];

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

カテゴリ:
- overview: アカウント全体の設計思想・方針
- naming: 命名規則（WF・フォーム・リスト・メール・プロパティ）
- properties: 重要なカスタムプロパティの用途と注意事項
- workflows: 既存ワークフローの意図と依存関係
- patterns: 繰り返し施策のテンプレートパターン（セミナー・ニュースレター等）
- guardrails: 触ってはいけない設定・やってはいけないこと
- history: 過去施策の記録と学び

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
            overview: "アカウント全体の設計思想・方針を記述してください。",
            naming: "WF・フォーム・リスト・メール・プロパティの命名規則を記述してください。",
            properties: "重要なカスタムプロパティの用途と注意事項を記述してください。",
            workflows: "既存ワークフローの意図と依存関係を記述してください。",
            patterns: "繰り返し施策（セミナー・ニュースレター等）のテンプレートパターンを記述してください。",
            guardrails: "触ってはいけない設定・やってはいけないことを記述してください。",
            history: "過去に実施した施策の記録と学びを追記してください。",
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
