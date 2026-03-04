import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { crmCreate } from "@/lib/hubspot/crm-client";
import { HubSpotError } from "@/lib/hubspot/errors";

export function registerContactCreate(server: McpServer) {
  server.tool(
    "contact_create",
    `HubSpot に新しいコンタクトを作成する。emailは推奨（重複判定キー）。既にあるメールアドレスと重複するとエラー。associationsで作成と同時に会社・取引等への関連付けも可能。

返却: 作成されたコンタクトのID, プロパティ, URL。
additionalPropertiesでカスタムプロパティも設定可能（properties_listツールでプロパティ名を確認）。`,
    {
      email: z.string().optional().describe("メールアドレス（HubSpotの重複判定キー。推奨だがAPI上は任意）"),
      firstname: z.string().optional().describe("名（例: '太郎'）"),
      lastname: z.string().optional().describe("姓（例: '山田'）"),
      phone: z.string().optional().describe("電話番号（例: '+81-3-1234-5678'）"),
      company: z.string().optional().describe("会社名（テキスト。会社レコードとの関連付けにはassociationsパラメータまたはassociation_createを使用）"),
      jobtitle: z.string().optional().describe("役職（例: '営業部長'）"),
      lifecyclestage: z.string().optional().describe("ライフサイクルステージ。有効値: subscriber / lead / marketingqualifiedlead / salesqualifiedlead / opportunity / customer / evangelist / other"),
      associations: z
        .array(
          z.object({
            to: z.object({ id: z.string().describe("関連先レコードID（数値文字列）") }).describe("関連先レコード"),
            types: z.array(
              z.object({
                associationCategory: z.string().describe("HUBSPOT_DEFINED（標準ラベル）/ USER_DEFINED（カスタムラベル）"),
                associationTypeId: z.number().describe("関連タイプID。association_labelsツールのlistで取得可能。主要デフォルト値: contact→company=279, company→contact=280, deal→contact=3, deal→company=5, ticket→contact=16, ticket→company=26"),
              })
            ).describe("関連タイプ定義の配列"),
          })
        )
        .optional()
        .describe("作成と同時に関連付けるレコードの配列（任意）。後からassociation_createでも紐付け可能"),
      additionalProperties: z.record(z.string()).optional().describe("追加プロパティ（キー:値）"),
    },
    async ({ email, firstname, lastname, phone, company, jobtitle, lifecyclestage, associations, additionalProperties }) => {
      try {
        const properties: Record<string, string> = {};
        if (email) properties.email = email;
        if (firstname) properties.firstname = firstname;
        if (lastname) properties.lastname = lastname;
        if (phone) properties.phone = phone;
        if (company) properties.company = company;
        if (jobtitle) properties.jobtitle = jobtitle;
        if (lifecyclestage) properties.lifecyclestage = lifecyclestage;
        if (additionalProperties) Object.assign(properties, additionalProperties);
        const result = await crmCreate("contacts", properties, associations);
        return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
      } catch (error) {
        const message = error instanceof HubSpotError ? `HubSpot API エラー (${error.status}): ${error.message}` : String(error);
        return { content: [{ type: "text" as const, text: message }], isError: true };
      }
    }
  );
}
