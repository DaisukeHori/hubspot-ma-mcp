import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { crmCreate } from "@/lib/hubspot/crm-client";
import { HubSpotError } from "@/lib/hubspot/errors";
import { formatToolResult, prettyParam } from "@/lib/mcp/utils/format-result";

export function registerCompanyCreate(server: McpServer) {
  server.tool(
    "company_create",
    `HubSpot に新しい会社レコードを作成する。nameは推奨。associationsで作成と同時にコンタクト・取引等への関連付けも可能。

返却: 作成された会社のID, プロパティ, URL。
additionalPropertiesでカスタムプロパティも設定可能。industryはHubSpot定義の列挙値のみ（例: COMPUTER_SOFTWARE, INFORMATION_TECHNOLOGY_AND_SERVICES）。`,
    {
      name: z.string().describe("会社名（必須。例: '株式会社レヴォル'）"),
      domain: z.string().optional().describe("会社のWebサイトドメイン（例: 'revol-club.jp'）。HubSpotの重複チェックに使用される"),
      industry: z.string().optional().describe("業種（HubSpot定義の列挙値。例: COMPUTER_SOFTWARE, INFORMATION_TECHNOLOGY_AND_SERVICES, MARKETING_AND_ADVERTISING等。properties_listで全値を確認可能）"),
      phone: z.string().optional().describe("電話番号（例: '+81-48-123-4567'）"),
      city: z.string().optional().describe("市区町村（例: '川口市'）"),
      state: z.string().optional().describe("都道府県 / 州（例: '埼玉県', 'California'）"),
      country: z.string().optional().describe("国（例: 'Japan'）"),
      associations: z
        .array(
          z.object({
            to: z.object({ id: z.string().describe("関連先レコードID（数値文字列）") }).describe("関連先レコード"),
            types: z.array(
              z.object({
                associationCategory: z.enum(["HUBSPOT_DEFINED", "USER_DEFINED"]).describe("HUBSPOT_DEFINED=標準ラベル / USER_DEFINED=カスタムラベル（公式仕様準拠）"),
                associationTypeId: z.number().describe("関連タイプID。association_labelsツールのlistで取得可能。主要デフォルト値: contact→company=279, company→contact=280, deal→contact=3, deal→company=5, ticket→contact=16, ticket→company=26"),
              })
            ).describe("関連タイプ定義の配列"),
          })
        )
        .optional()
        .describe("作成と同時に関連付けるレコードの配列（任意）。後からassociation_createでも紐付け可能"),
      additionalProperties: z.record(z.string()).optional().describe("追加プロパティ（キー:値）。カスタムプロパティ名はproperties_listツールで確認可能"),
    
      pretty: prettyParam,
},
    async ({ name, domain, industry, phone, city, state, country, associations, additionalProperties, pretty }) => {
      try {
        const properties: Record<string, string> = {};
        if (name) properties.name = name;
        if (domain) properties.domain = domain;
        if (industry) properties.industry = industry;
        if (phone) properties.phone = phone;
        if (city) properties.city = city;
        if (state) properties.state = state;
        if (country) properties.country = country;
        if (additionalProperties) Object.assign(properties, additionalProperties);
        const result = await crmCreate("companies", properties, associations);
        return { content: [{ type: "text" as const, text: formatToolResult(result, pretty) }] };
      } catch (error) {
        const message = error instanceof HubSpotError ? `HubSpot API エラー (${error.status}): ${error.message}` : String(error);
        return { content: [{ type: "text" as const, text: message }], isError: true };
      }
    }
  );
}
