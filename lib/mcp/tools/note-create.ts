import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { crmCreate } from "@/lib/hubspot/crm-client";
import { HubSpotError } from "@/lib/hubspot/errors";

export function registerNoteCreate(server: McpServer) {
  server.tool(
    "note_create",
    "HubSpot メモを作成する。コンタクト・会社・取引等への関連付けも可能。",
    {
      body: z.string().describe("メモの本文（HTML可）。hs_attachment_idsプロパティでファイル添付も可能（ファイルIDをセミコロン区切り）"),
      timestamp: z.string().optional().describe("タイムスタンプ（ISO8601）。省略時は現在時刻"),
      ownerId: z.string().optional().describe("担当者のHubSpotユーザーID（数値文字列）。HubSpot管理画面のユーザー設定で確認可能"),
      associations: z
        .array(
          z.object({
            to: z.object({ id: z.string().describe("関連先レコードID") }).describe("関連先レコード"),
            types: z.array(
              z.object({
                associationCategory: z.string().describe("HUBSPOT_DEFINED（標準ラベル）/ USER_DEFINED（カスタムラベル）"),
                associationTypeId: z.number().describe("関連タイプID（例: 202=note→contact, 190=note→company, 214=note→deal）。association_labelsツールのlistで取得可能"),
              })
            ).describe("関連タイプ定義の配列。各要素にassociationCategory + associationTypeIdを指定"),
          })
        )
        .optional()
        .describe("関連付け先レコードの配列。各要素にto（レコードID）とtypes（関連タイプ定義: associationCategory + associationTypeId）を指定"),
    },
    async ({ body, timestamp, ownerId, associations }) => {
      try {
        const properties: Record<string, string> = {
          hs_note_body: body,
          hs_timestamp: timestamp ?? new Date().toISOString(),
        };
        if (ownerId) properties.hubspot_owner_id = ownerId;
        const result = await crmCreate("notes" as any, properties, associations);
        return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
      } catch (error) {
        const message = error instanceof HubSpotError ? `HubSpot API エラー (${error.status}): ${error.message}` : String(error);
        return { content: [{ type: "text" as const, text: message }], isError: true };
      }
    }
  );
}
