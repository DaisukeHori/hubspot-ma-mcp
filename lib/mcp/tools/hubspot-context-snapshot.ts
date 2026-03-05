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

type Section = "properties_custom" | "workflows" | "pipelines" | "forms" | "lists" | "emails" | "campaigns" | "events" | "owners";

const ALL_SECTIONS: Section[] = ["properties_custom", "workflows", "pipelines", "forms", "lists", "emails", "campaigns", "events", "owners"];

async function fetchSection(section: Section, headers: Record<string, string>): Promise<Record<string, unknown>> {
  try {
    switch (section) {
      case "properties_custom": {
        const objects = ["contacts", "companies", "deals", "tickets"];
        const result: Record<string, unknown[]> = {};
        for (const obj of objects) {
          const data = await fetchJson<{ results: Array<Record<string, unknown>> }>(
            `${BASE_URL}/crm/v3/properties/${obj}`,
            { method: "GET", headers }
          );
          // カスタムプロパティのみ抽出（HubSpot定義以外）
          result[obj] = data.results
            .filter((p: Record<string, unknown>) => !(p.hubspotDefined as boolean))
            .map((p: Record<string, unknown>) => ({
              name: p.name,
              label: p.label,
              type: p.type,
              fieldType: p.fieldType,
              groupName: p.groupName,
              description: p.description,
            }));
        }
        return { customProperties: result };
      }
      case "workflows": {
        const data = await fetchJson<{ flows: Array<Record<string, unknown>> }>(
          `${BASE_URL}/automation/v4/flows`,
          { method: "GET", headers }
        );
        return {
          workflows: (data.flows || []).map((f: Record<string, unknown>) => ({
            id: f.id,
            name: f.name,
            isEnabled: f.isEnabled,
            objectTypeId: f.objectTypeId,
          })),
        };
      }
      case "pipelines": {
        const deals = await fetchJson<{ results: unknown[] }>(`${BASE_URL}/crm/v3/pipelines/deals`, { method: "GET", headers });
        const tickets = await fetchJson<{ results: unknown[] }>(`${BASE_URL}/crm/v3/pipelines/tickets`, { method: "GET", headers });
        return { pipelines: { deals: deals.results, tickets: tickets.results } };
      }
      case "forms": {
        const data = await fetchJson<{ results: Array<Record<string, unknown>> }>(
          `${BASE_URL}/marketing/v3/forms?limit=100`,
          { method: "GET", headers }
        );
        return {
          forms: (data.results || []).map((f: Record<string, unknown>) => ({
            id: f.id, name: f.name, formType: f.formType, createdAt: f.createdAt, updatedAt: f.updatedAt,
          })),
        };
      }
      case "lists": {
        const data = await fetchJson<{ lists: Array<Record<string, unknown>> }>(
          `${BASE_URL}/crm/v3/lists/search`,
          { method: "POST", headers, body: JSON.stringify({}) }
        );
        return {
          lists: (data.lists || []).map((l: Record<string, unknown>) => ({
            listId: l.listId, name: l.name, processingType: l.processingType,
            objectTypeId: l.objectTypeId, size: (l.additionalProperties as Record<string, string>)?.hs_list_size,
          })),
        };
      }
      case "emails": {
        const data = await fetchJson<{ results: Array<Record<string, unknown>> }>(
          `${BASE_URL}/marketing/v3/emails?limit=50`,
          { method: "GET", headers }
        );
        return {
          marketingEmails: (data.results || []).map((e: Record<string, unknown>) => ({
            id: e.id, name: e.name, subject: e.subject, state: e.state, type: e.type, publishDate: e.publishDate,
          })),
        };
      }
      case "campaigns": {
        const data = await fetchJson<{ results: Array<Record<string, unknown>> }>(
          `${BASE_URL}/marketing/v3/campaigns?limit=50&properties=hs_name,hs_start_date,hs_end_date`,
          { method: "GET", headers }
        );
        return { campaigns: data.results || [] };
      }
      case "events": {
        const data = await fetchJson<{ results: Array<Record<string, unknown>> }>(
          `${BASE_URL}/events/v3/event-definitions`,
          { method: "GET", headers }
        );
        return { customEventDefinitions: data.results || [] };
      }
      case "owners": {
        const data = await fetchJson<{ results: Array<Record<string, unknown>> }>(
          `${BASE_URL}/crm/v3/owners?limit=100`,
          { method: "GET", headers }
        );
        return {
          owners: (data.results || []).map((o: Record<string, unknown>) => ({
            id: o.id, email: o.email, firstName: o.firstName, lastName: o.lastName,
          })),
        };
      }
      default:
        return {};
    }
  } catch (e) {
    const msg = e instanceof HubSpotError ? `${e.status}: ${e.hubspotMessage}` : String(e);
    return { [`${section}_error`]: msg };
  }
}

export function registerHubspotContextSnapshot(server: McpServer) {
  server.tool(
    "hubspot_context_snapshot",
    `HubSpot の現在の設定状態を一括取得する。AIがMA担当者として「今何が動いているか」を把握するためのスナップショット。

取得セクション:
- properties_custom: 全オブジェクトのカスタムプロパティ一覧（HubSpot定義を除く）
- workflows: ワークフロー一覧（名前、有効/無効、対象オブジェクト）
- pipelines: パイプライン+ステージ一覧（deals/tickets）
- forms: フォーム一覧
- lists: リスト/セグメント一覧（メンバー数含む）
- emails: マーケティングメール一覧（状態・タイプ含む）
- campaigns: キャンペーン一覧
- events: カスタムイベント定義一覧
- owners: オーナー（担当者）一覧

sections省略で全セクション取得（コンテキスト消費大）。必要なセクションだけ指定することを推奨。
hubspot_knowledge_getと組み合わせて使用: knowledgeが「なぜ」、snapshotが「今どうなっているか」。`,
    {
      sections: z.array(z.enum(["properties_custom", "workflows", "pipelines", "forms", "lists", "emails", "campaigns", "events", "owners"])).optional()
        .describe("取得するセクション。省略時は全セクション"),
    },
    async ({ sections }) => {
      try {
        const headers = getHeaders();
        const targetSections = sections || ALL_SECTIONS;
        const snapshot: Record<string, unknown> = { snapshotAt: new Date().toISOString() };

        for (const section of targetSections) {
          const data = await fetchSection(section, headers);
          Object.assign(snapshot, data);
        }

        return {
          content: [{ type: "text" as const, text: JSON.stringify(snapshot, null, 2) }],
        };
      } catch (error) {
        const message = error instanceof HubSpotError ? `HubSpot API エラー (${error.status}): ${error.message}` : String(error);
        return { content: [{ type: "text" as const, text: message }], isError: true };
      }
    }
  );
}
