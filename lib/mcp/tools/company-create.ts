import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { crmCreate } from "@/lib/hubspot/crm-client";
import { HubSpotError } from "@/lib/hubspot/errors";

export function registerCompanyCreate(server: McpServer) {
  server.tool(
    "company_create",
    "HubSpot に新しい会社を作成する。",
    {
      name: z.string().describe("会社名（必須）"),
      domain: z.string().optional().describe("ドメイン名"),
      industry: z.string().optional().describe("業種"),
      phone: z.string().optional().describe("電話番号"),
      city: z.string().optional().describe("市区町村"),
      state: z.string().optional().describe("都道府県"),
      country: z.string().optional().describe("国"),
      additionalProperties: z.record(z.string()).optional(),
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
