import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createProperty } from "../../hubspot/crm-client";

export function registerPropertyCreate(server: McpServer) {
  server.tool(
    "property_create",
    "カスタムプロパティを作成する。type: string/number/date/datetime/enumeration, fieldType: text/textarea/number/date/select/checkbox/radio 等",
    {
      objectType: z.string().describe("対象オブジェクト（contacts / companies / deals / tickets / line_items / products）"),
      name: z.string().describe("内部名（英数字・アンダースコアのみ）"),
      label: z.string().describe("UIに表示するラベル名（例: '担当美容師'）"),
      type: z.string().describe("型: string / number / date / datetime / enumeration"),
      fieldType: z.string().describe("フィールド種別: text / textarea / number / date / select / checkbox / radio"),
      groupName: z.string().describe("プロパティグループ名"),
      description: z.string().optional().describe("プロパティの説明文（UIに表示される）"),
      hasUniqueValue: z.boolean().optional().describe("ユニーク値制約。trueにすると同じ値を持つレコードを複数作れなくなる。デフォルト: false"),
      options: z.array(z.object({
        label: z.string().describe("選択肢の表示名（例: 'Aランク'）"),
        value: z.string().describe("選択肢の内部値（例: 'rank_a'。英数字推奨）"),
        displayOrder: z.number().describe("表示順（0始まり。小さいほど先に表示）"),
      })).optional().describe("選択肢（enumeration型の場合）"),
    },
    async ({ objectType, name, label, type, fieldType, groupName, description, hasUniqueValue, options }) => {
      const result = await createProperty(objectType, {
        name, label, type, fieldType, groupName,
        ...(description && { description }),
        ...(hasUniqueValue !== undefined && { hasUniqueValue }),
        ...(options && { options }),
      });
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );
}
