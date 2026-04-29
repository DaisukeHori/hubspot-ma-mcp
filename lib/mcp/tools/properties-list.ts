import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { listProperties } from "@/lib/hubspot/crm-client";
import { HubSpotError } from "@/lib/hubspot/errors";
import { formatToolResult, prettyParam } from "@/lib/mcp/utils/format-result";

export function registerPropertiesList(server: McpServer) {
  server.tool(
    "properties_list",
    `HubSpot オブジェクトのプロパティ定義一覧を取得する。標準・カスタム両方のプロパティを含む。
返却: 各プロパティの name（内部名、API送信時に使う）, label（UI表示名）, type（データ型）,
fieldType（UIフィールド種別）, groupName（プロパティグループ）, description, options（enum型の選択肢）。
用途:
- contact_create / deal_update 等で渡す properties のキー名を確認
- カスタムプロパティが既に存在するかチェック（重複作成回避）
- enumeration型プロパティの有効な value 一覧を取得
公式: GET /crm/v3/properties/{objectType}`,
    {
      objectType: z.enum(["contacts", "companies", "deals", "tickets"]).describe("オブジェクトタイプ: contacts, companies, deals, tickets のいずれか"),
    
      pretty: prettyParam,
},
    async ({ objectType, pretty }) => {
      try {
        const result = await listProperties(objectType);
        const summary = result.map((p) => ({
          name: p.name,
          label: p.label,
          type: p.type,
          fieldType: p.fieldType,
          groupName: p.groupName,
          description: p.description || undefined,
          options: p.options?.length ? p.options : undefined,
        }));
        return { content: [{ type: "text" as const, text: formatToolResult({ total: summary.length, properties: summary }, pretty) }] };
      } catch (error) {
        const message = error instanceof HubSpotError ? `HubSpot API エラー (${error.status}): ${error.message}` : String(error);
        return { content: [{ type: "text" as const, text: message }], isError: true };
      }
    }
  );
}
