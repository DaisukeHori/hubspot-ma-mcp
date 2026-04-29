import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getHubSpotToken } from "@/lib/hubspot/auth-context";
import { HubSpotError } from "@/lib/hubspot/errors";
import { formatToolResult, prettyParam } from "@/lib/mcp/utils/format-result";

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

export function registerHubspotMarketingReview(server: McpServer) {
  server.tool(
    "hubspot_marketing_review",
    `HubSpot のマーケティング実績データを集計し、Knowledge Store の goals と比較してレビューを生成する。

AIがMA担当者として「今の進捗はどうか」「何をすべきか」を自発的に判断するためのデータ収集ツール。

取得するデータ:
- 期間内の新規コンタクト数（リード獲得数）
- 期間内の新規会社数・新規取引数
- マーケティングメールの配信・開封・クリック統計（/statistics/list API使用）
- フォーム一覧
- 直近のキャンペーン一覧

返却: 実績データの構造化JSON。goals との比較・分析・提案生成はAI側で行う。

会話開始時に goals カテゴリが存在する場合、このツールを自動的に呼び出して
「目標に対する現在の進捗」を把握し、ユーザーへの自発的な提案の根拠とする。`,
    {
      periodDays: z.number().optional().describe("集計期間（日数）。デフォルト30日。7=直近1週間、90=四半期"),
    
      pretty: prettyParam,
},
    async ({ periodDays, pretty }) => {
      try {
        const headers = getHeaders();
        const days = periodDays || 30;
        const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
        const now = new Date().toISOString();

        const review: Record<string, unknown> = {
          period: { days, from: since.split("T")[0], to: now.split("T")[0] },
        };

        // 1. 新規コンタクト数（リード獲得）
        try {
          const contactSearch = await fetchJson<{ total: number }>(
            `${BASE_URL}/crm/v3/objects/contacts/search`,
            {
              method: "POST", headers,
              body: JSON.stringify({
                filterGroups: [{
                  filters: [{
                    propertyName: "createdate",
                    operator: "GTE",
                    value: new Date(Date.now() - days * 24 * 60 * 60 * 1000).getTime().toString(),
                  }],
                }],
                limit: 0,
              }),
            }
          );
          review.newContacts = contactSearch.total;
        } catch { review.newContacts = "取得エラー"; }

        // 2. 新規会社数
        try {
          const companySearch = await fetchJson<{ total: number }>(
            `${BASE_URL}/crm/v3/objects/companies/search`,
            {
              method: "POST", headers,
              body: JSON.stringify({
                filterGroups: [{
                  filters: [{
                    propertyName: "createdate",
                    operator: "GTE",
                    value: new Date(Date.now() - days * 24 * 60 * 60 * 1000).getTime().toString(),
                  }],
                }],
                limit: 0,
              }),
            }
          );
          review.newCompanies = companySearch.total;
        } catch { review.newCompanies = "取得エラー"; }

        // 3. 新規取引数
        try {
          const dealSearch = await fetchJson<{ total: number }>(
            `${BASE_URL}/crm/v3/objects/deals/search`,
            {
              method: "POST", headers,
              body: JSON.stringify({
                filterGroups: [{
                  filters: [{
                    propertyName: "createdate",
                    operator: "GTE",
                    value: new Date(Date.now() - days * 24 * 60 * 60 * 1000).getTime().toString(),
                  }],
                }],
                limit: 0,
              }),
            }
          );
          review.newDeals = dealSearch.total;
        } catch { review.newDeals = "取得エラー"; }

        // 4. マーケティングメール一覧（updatedAfterで期間フィルタ）
        try {
          const sinceDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
          const emailData = await fetchJson<{ results: Array<Record<string, unknown>> }>(
            `${BASE_URL}/marketing/v3/emails?limit=20&updatedAfter=${encodeURIComponent(sinceDate)}`,
            { method: "GET", headers }
          );

          const recentEmails = (emailData.results || [])
            .map((e: Record<string, unknown>) => ({
              id: e.id, name: e.name, subject: e.subject, state: e.state, type: e.type,
              publishDate: e.publishDate, updatedAt: e.updatedAt,
            }));
          review.marketingEmails = {
            totalRecent: recentEmails.length,
            emails: recentEmails,
          };
        } catch { review.marketingEmails = "取得エラー"; }

        // 4b. メール統計（/statistics/list API — 期間内の集計値）
        try {
          const statsFrom = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
          const statsData = await fetchJson<{ results: Array<Record<string, unknown>> }>(
            `${BASE_URL}/marketing/v3/emails/statistics/list?startTimestamp=${encodeURIComponent(statsFrom)}`,
            { method: "GET", headers }
          );
          review.emailStatistics = (statsData.results || []).map((s: Record<string, unknown>) => ({
            emailId: s.emailId,
            aggregations: s.aggregations,
          }));
        } catch { review.emailStatistics = "取得エラー（Marketing Hub Professional以上が必要な場合があります）"; }

        // 5. フォーム一覧（送信数はsubmissions APIが別途必要なため件数のみ）
        try {
          const formData = await fetchJson<{ results: Array<Record<string, unknown>> }>(
            `${BASE_URL}/marketing/v3/forms?limit=50`,
            { method: "GET", headers }
          );
          review.forms = {
            totalForms: (formData.results || []).length,
            forms: (formData.results || []).map((f: Record<string, unknown>) => ({
              id: f.id, name: f.name, formType: f.formType, createdAt: f.createdAt,
            })),
          };
        } catch { review.forms = "取得エラー"; }

        // 6. キャンペーン一覧（直近）
        try {
          const campData = await fetchJson<{ results: Array<Record<string, unknown>> }>(
            `${BASE_URL}/marketing/v3/campaigns?limit=10&properties=hs_name,hs_start_date,hs_end_date`,
            { method: "GET", headers }
          );
          review.campaigns = (campData.results || []).map((c: Record<string, unknown>) => ({
            id: c.id,
            properties: c.properties,
          }));
        } catch { review.campaigns = "取得エラー"; }

        // 7. カレンダー上の直近イベント（Knowledge Storeのcalendarを参照する指示）
        review.note = "goals / calendar との比較分析はAI側で実施してください。hubspot_knowledge_get(category: 'goals') と hubspot_knowledge_get(category: 'calendar') を併せて参照し、進捗評価・次のアクション提案を生成してください。";

        return {
          content: [{ type: "text" as const, text: formatToolResult(review, pretty) }],
        };
      } catch (error) {
        const message = error instanceof HubSpotError ? `HubSpot API エラー (${error.status}): ${error.message}` : String(error);
        return { content: [{ type: "text" as const, text: message }], isError: true };
      }
    }
  );
}
