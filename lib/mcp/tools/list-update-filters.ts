/**
 * list_update_filters ツール
 * DYNAMIC リストのフィルタ条件を更新する
 *
 * 公式: PUT /crm/v3/lists/{listId}/update-list-filters
 * 参考: https://developers.hubspot.com/docs/api-reference/crm-lists-v3/list-filters
 *
 * 用途:
 *  - セミナー集客リスト等で、対象フォームを月次で追加・差し替え
 *  - 既存リストのフィルタを構造ごと再設計（フォームA/B/C/Z 4つに変更等）
 *  - キャンペーン期間の延長に伴う日付範囲更新
 *
 * 制約:
 *  - DYNAMIC リスト（processingType: "DYNAMIC"）専用
 *  - MANUAL / SNAPSHOT リストには使えない（HubSpot 側でエラー）
 *  - フィルタ更新後、メンバーシップは非同期で再評価される（即時反映ではない）
 *
 * 隠れ仕様:
 *  - filterBranch のトップレベル filterBranchType は通常 "OR"、その中に AND ブランチをぶら下げる構造
 *  - フォームを追加する場合は filterBranches[] 内の filters[] に
 *    `{ filterType: "FORM_SUBMISSION", form: { formId: "..." }, ... }` を追加する
 *  - 既存構造を取得するには list_get(listId, includeFilters=true) を使う
 */

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
    try {
      const body = await response.json();
      message = body.message || JSON.stringify(body);
    } catch {
      /* ignore */
    }
    throw new HubSpotError(response.status, message);
  }
  return response.json() as Promise<T>;
}

function getHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${getHubSpotToken()}`,
    "Content-Type": "application/json",
  };
}

export function registerListUpdateFilters(server: McpServer) {
  server.tool(
    "list_update_filters",
    `DYNAMIC リスト（セグメント）のフィルタ条件を更新する（PUT /crm/v3/lists/{listId}/update-list-filters）。

【動作】
更新後、リストのメンバーシップが非同期で再評価される（即時反映ではない、数秒〜数分）。
新たにリストに含まれるレコードを連動WFに自動エンロールするかは enrollObjectsInWorkflows で制御。

【制約】
- DYNAMIC リスト専用。MANUAL / SNAPSHOT リストには使えない（HubSpot側でエラー）
- filterBranch は完全置換（PUT 動作）。部分更新ではないので、既存フィルタも含めた完全な構造を渡すこと
- 既存構造を確認するには list_get(listId, includeFilters=true) を先に実行

【典型的な filterBranch 構造】
\`\`\`json
{
  "filterBranchType": "OR",
  "filterBranchOperator": "OR",
  "filterBranches": [
    {
      "filterBranchType": "AND",
      "filterBranchOperator": "AND",
      "filterBranches": [],
      "filters": [
        {
          "filterType": "FORM_SUBMISSION",
          "form": { "formId": "uuid-of-form-A" },
          "operation": { "operator": "HAS_BEEN_SUBMITTED", ... }
        }
      ]
    }
  ],
  "filters": []
}
\`\`\`

【返却】
更新後のリスト定義（id, name, processingStatus, filterBranch 等）。
processingStatus が "PROCESSING" の間はメンバーシップ再評価中。`,
    {
      listId: z
        .string()
        .describe("ILS List ID（数値文字列）。list_search または list_get の返却値から取得"),
      filterBranch: z
        .record(z.string(), z.unknown())
        
        .describe(
          "新しいフィルタ条件のツリー全体（PUT 動作なので完全置換）。" +
          "filterBranchType (OR/AND), filterBranchOperator (OR/AND), filters[], filterBranches[] を含む。" +
          "list_get(listId, includeFilters=true) で既存構造を取得して、それをベースに編集して渡すのが確実。"
        ),
      enrollObjectsInWorkflows: z
        .boolean()
        .optional()
        .describe(
          "フィルタ変更により新たにリストに含まれることになったレコードを、" +
          "リスト連動WFに自動エンロールするか（デフォルト false）。" +
          "通常 false 推奨（既存メンバーは既にエンロール済みだから）。" +
          "true にすると過去エンロール済みのコンタクトも再エンロール対象になり得るので注意。"
        ),
      pretty: prettyParam,
    },
    async ({ listId, filterBranch, enrollObjectsInWorkflows, pretty }) => {
      try {
        const params = new URLSearchParams();
        if (enrollObjectsInWorkflows !== undefined) {
          params.set("enrollObjectsInWorkflows", String(enrollObjectsInWorkflows));
        }
        const qs = params.toString() ? `?${params.toString()}` : "";

        const result = await fetchJson<Record<string, unknown>>(
          `${BASE_URL}/crm/v3/lists/${listId}/update-list-filters${qs}`,
          {
            method: "PUT",
            headers: getHeaders(),
            body: JSON.stringify({ filterBranch }),
          }
        );

        return {
          content: [
            {
              type: "text" as const,
              text: formatToolResult(result, pretty),
            },
          ],
        };
      } catch (error) {
        const message =
          error instanceof HubSpotError
            ? `HubSpot API エラー (${error.status}): ${error.message}`
            : String(error);
        return {
          content: [{ type: "text" as const, text: message }],
          isError: true,
        };
      }
    }
  );
}
