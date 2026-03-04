import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { listAssociationLabels, createAssociationLabel } from "@/lib/hubspot/crm-client";
import { HubSpotError } from "@/lib/hubspot/errors";

export function registerAssociationLabels(server: McpServer) {
  server.tool(
    "association_labels",
    "HubSpot の関連付けラベル定義を取得または作成する。2オブジェクト間で利用可能なassociationTypeIdとラベルの一覧を取得。カスタムラベルの新規作成も可能。方向により異なるtypeIdが返される。",
    {
      fromObjectType: z.string().describe("元オブジェクトタイプ（contacts, companies, deals, tickets 等）"),
      toObjectType: z.string().describe("関連先オブジェクトタイプ"),
      action: z.enum(["list", "create"]).describe("list: ラベル一覧取得 / create: カスタムラベル作成"),
      label: z.string().optional().describe("作成するラベル名（action=create時に必須。例: 'Decision Maker', '請求先'）"),
      name: z.string().optional().describe("ラベル内部名（action=create時に必須。英数字snake_case。例: 'decision_maker'）"),
    },
    async ({ fromObjectType, toObjectType, action, label, name }) => {
      try {
        if (action === "create") {
          if (!label || !name) {
            return { content: [{ type: "text" as const, text: "エラー: action=create の場合、label と name は必須です。" }], isError: true };
          }
          const result = await createAssociationLabel(fromObjectType, toObjectType, label, name);
          return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
        } else {
          const result = await listAssociationLabels(fromObjectType, toObjectType);
          return {
            content: [{
              type: "text" as const,
              text: JSON.stringify({
                description: `${fromObjectType} → ${toObjectType} の関連ラベル定義`,
                total: result.results.length,
                labels: result.results,
              }, null, 2),
            }],
          };
        }
      } catch (error) {
        const message = error instanceof HubSpotError ? `HubSpot API エラー (${error.status}): ${error.message}` : String(error);
        return { content: [{ type: "text" as const, text: message }], isError: true };
      }
    }
  );
}
