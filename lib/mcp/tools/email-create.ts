import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { crmCreate } from "@/lib/hubspot/crm-client";

export function registerEmailCreate(server: McpServer) {
  server.tool(
  "email_create",
  "新しいメールエンゲージメントを作成する。返却値: id, properties, createdAt。associationsで既存レコードに紐付け可能。",
  {
    properties: z.record(z.string()).describe("メールのプロパティ（キー:値）。主要プロパティ: hs_email_subject, hs_email_text, hs_email_status, hs_email_direction。プロパティ名はproperties_listツールで確認可能"),
    associations: z.array(z.object({
      to: z.object({ id: z.string().describe("関連先レコードID") }).describe("関連先レコード"),
      types: z.array(z.object({
        associationCategory: z.string().describe("HUBSPOT_DEFINED（標準ラベル）/ USER_DEFINED（カスタムラベル）"),
        associationTypeId: z.number().describe("関連タイプID。association_labelsツールのlistで取得可能"),
      })).describe("関連タイプ定義の配列"),
    })).optional().describe("関連付け先レコードの配列"),
  },
  async ({ properties, associations }) => {
    const result = await crmCreate("emails", properties, associations);
    return {
      content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
    };
  }
);
}
