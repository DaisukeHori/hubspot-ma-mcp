import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { crmCreate } from "@/lib/hubspot/crm-client";
import { HubSpotError } from "@/lib/hubspot/errors";

export function registerCompanyCreate(server: McpServer) {
  server.tool(
    "company_create",
    `HubSpot に新しい会社レコードを作成する。nameは必須。

返却: 作成された会社のID, プロパティ, URL。
additionalPropertiesでカスタムプロパティも設定可能。industryはHubSpot定義の列挙値のみ（例: COMPUTER_SOFTWARE, INFORMATION_TECHNOLOGY_AND_SERVICES）。`,
    {
      name: z.string().describe("会社名（必須。例: '株式会社レヴォル'）"),
      domain: z.string().optional().describe("会社のWebサイトドメイン（例: 'revol-club.jp'）。HubSpotの重複チェックに使用される"),
      industry: z.string().optional().describe("業種（HubSpot定義の列挙値。例: COMPUTER_SOFTWARE, INFORMATION_TECHNOLOGY_AND_SERVICES, MARKETING_AND_ADVERTISING等。properties_listで全値を確認可能）"),
      phone: z.string().optional().describe("電話番号（例: '+81-48-123-4567'）"),
      city: z.string().optional().describe("市区町村（例: '川口市'）"),
      state: z.string().optional().describe("都道府県（例: '埼玉県'）"),
      country: z.string().optional().describe("国（例: 'Japan'）"),
      additionalProperties: z.record(z.string()).optional().describe("追加プロパティ（キー:値）。カスタムプロパティ名はproperties_listツールで確認可能"),
    },
    async ({ name, domain, industry, phone, city, state, country, additionalProperties }) => {
      try {
        const properties: Record<string, string> = { name };
        if (domain) properties.domain = domain;
        if (industry) properties.industry = industry;
        if (phone) properties.phone = phone;
        if (city) properties.city = city;
        if (state) properties.state = state;
        if (country) properties.country = country;
        if (additionalProperties) Object.assign(properties, additionalProperties);
        const result = await crmCreate("companies", properties);
        return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
      } catch (error) {
        const message = error instanceof HubSpotError ? `HubSpot API エラー (${error.status}): ${error.message}` : String(error);
        return { content: [{ type: "text" as const, text: message }], isError: true };
      }
    }
  );
}
