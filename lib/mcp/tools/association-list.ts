import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { listAssociations } from "@/lib/hubspot/crm-client";
import { HubSpotError } from "@/lib/hubspot/errors";

export function registerAssociationList(server: McpServer) {
  server.tool(
    "association_list",
    `HubSpot レコードの関連付け一覧を取得する（方向あり: from→to）。

結果には関連先レコードIDと、各関連に付いているラベル情報（category, typeId, label）が含まれる。
ページネーション対応（after パラメータ）。

例: fromObjectType="contacts", fromObjectId="123", toObjectType="companies"
→ コンタクト123に紐づく全会社と、各関連のラベル（Primary, カスタムラベル等）を取得。`,
    {
      fromObjectType: z.string().describe("元オブジェクトタイプ（方向の起点）: contacts, companies, deals, tickets, notes, tasks, line_items, products"),
      fromObjectId: z.string().describe("元レコード ID"),
      toObjectType: z.string().describe("関連先オブジェクトタイプ"),
      limit: z.number().min(1).max(500).optional().describe("取得件数（デフォルト100、最大500）"),
      after: z.string().optional().describe("ページネーション用カーソル（前回レスポンスのpaging.next.afterを指定）"),
    },
    async ({ fromObjectType, fromObjectId, toObjectType, limit, after }) => {
      try {
        const result = await listAssociations(fromObjectType, fromObjectId, toObjectType, limit, after);
        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify(result, null, 2),
          }],
        };
      } catch (error) {
        const message = error instanceof HubSpotError ? `HubSpot API エラー (${error.status}): ${error.message}` : String(error);
        return { content: [{ type: "text" as const, text: message }], isError: true };
      }
    }
  );
}
