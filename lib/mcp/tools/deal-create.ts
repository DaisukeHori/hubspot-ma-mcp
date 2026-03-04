import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { crmCreate } from "@/lib/hubspot/crm-client";
import { HubSpotError } from "@/lib/hubspot/errors";

export function registerDealCreate(server: McpServer) {
  server.tool(
    "deal_create",
    `HubSpot に新しい取引（Deal）を作成する。dealnameは必須。

返却: 作成された取引のID, プロパティ, URL。
dealstageはpipeline_listツールで取得したステージIDを指定。additionalPropertiesでカスタムプロパティも設定可能。`,
    {
      dealname: z.string().describe("取引名（必須。例: '2026年Q1 サロン導入案件'）"),
      amount: z.string().optional().describe("金額（文字列。例: '1000000'）"),
      dealstage: z.string().optional().describe("取引ステージID（pipeline_listツールでpipeline=dealsの各stageのidを取得して指定）"),
      pipeline: z.string().optional().describe("パイプライン ID（デフォルト: default）"),
      closedate: z.string().optional().describe("クローズ日（ISO8601）"),
      hubspot_owner_id: z.string().optional().describe("担当者のHubSpotユーザーID（数値文字列）。HubSpot管理画面のユーザー設定で確認可能"),
      additionalProperties: z.record(z.string()).optional().describe("追加プロパティ（キー:値）。カスタムプロパティ名はproperties_listツールで確認可能"),
    },
    async ({ dealname, amount, dealstage, pipeline, closedate, hubspot_owner_id, additionalProperties }) => {
      try {
        const properties: Record<string, string> = { dealname };
        if (amount) properties.amount = amount;
        if (dealstage) properties.dealstage = dealstage;
        if (pipeline) properties.pipeline = pipeline;
        if (closedate) properties.closedate = closedate;
        if (hubspot_owner_id) properties.hubspot_owner_id = hubspot_owner_id;
        if (additionalProperties) Object.assign(properties, additionalProperties);
        const result = await crmCreate("deals", properties);
        return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
      } catch (error) {
        const message = error instanceof HubSpotError ? `HubSpot API エラー (${error.status}): ${error.message}` : String(error);
        return { content: [{ type: "text" as const, text: message }], isError: true };
      }
    }
  );
}
