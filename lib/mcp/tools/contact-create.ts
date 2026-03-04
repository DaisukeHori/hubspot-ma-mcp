import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { crmCreate } from "@/lib/hubspot/crm-client";
import { HubSpotError } from "@/lib/hubspot/errors";

export function registerContactCreate(server: McpServer) {
  server.tool(
    "contact_create",
    `HubSpot に新しいコンタクトを作成する。emailは必須。既存メールアドレスと重複するとエラー。

返却: 作成されたコンタクトのID, プロパティ, URL。
additionalPropertiesでカスタムプロパティも設定可能（properties_listツールでプロパティ名を確認）。`,
    {
      email: z.string().describe("メールアドレス（必須）"),
      firstname: z.string().optional().describe("名（例: '太郎'）"),
      lastname: z.string().optional().describe("姓（例: '山田'）"),
      phone: z.string().optional().describe("電話番号（例: '+81-3-1234-5678'）"),
      company: z.string().optional().describe("会社名（テキスト。会社レコードとの関連付けにはassociation_createを使用）"),
      jobtitle: z.string().optional().describe("役職（例: '営業部長'）"),
      lifecyclestage: z.string().optional().describe("ライフサイクルステージ"),
      additionalProperties: z.record(z.string()).optional().describe("追加プロパティ（キー:値）"),
    },
    async ({ email, firstname, lastname, phone, company, jobtitle, lifecyclestage, additionalProperties }) => {
      try {
        const properties: Record<string, string> = { email };
        if (firstname) properties.firstname = firstname;
        if (lastname) properties.lastname = lastname;
        if (phone) properties.phone = phone;
        if (company) properties.company = company;
        if (jobtitle) properties.jobtitle = jobtitle;
        if (lifecyclestage) properties.lifecyclestage = lifecyclestage;
        if (additionalProperties) Object.assign(properties, additionalProperties);
        const result = await crmCreate("contacts", properties);
        return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
      } catch (error) {
        const message = error instanceof HubSpotError ? `HubSpot API エラー (${error.status}): ${error.message}` : String(error);
        return { content: [{ type: "text" as const, text: message }], isError: true };
      }
    }
  );
}
