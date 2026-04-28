import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { crmCreate } from "@/lib/hubspot/crm-client";

export function registerEmailCreate(server: McpServer) {
  server.tool(
  "email_create",
  `新しいメールエンゲージメント（送受信メールの記録）を作成する。
コンタクト・会社・取引のタイムラインに表示される手動ログ。
注意: マーケティングメール送信ではない（送信は marketing_email_publish や single_send_email を使う）。
これは「電話メモ」のような、外部で送受信したメールを HubSpot に記録するためのツール。

properties は必ず hs_timestamp を含むこと（ISO 8601 または Unix ミリ秒）。
hs_email_headers は from/to/cc/bcc を含むJSON文字列で渡す。
返却: id, properties, createdAt。
よくある関連タイプID: 198=email→contact, 186=email→company, 210=email→deal, 224=email→ticket。
公式: POST /crm/v3/objects/emails`,
  {
    properties: z.record(z.string()).describe("メールのプロパティ（キー:値）。hs_timestampは必須（ISO8601/Unixミリ秒）。主要プロパティ: hs_email_subject(件名), hs_email_text(本文), hs_email_status(SENT等), hs_email_direction(EMAIL), hs_email_headers(JSON文字列: {from:{email,firstName,lastName},to:[{email,firstName,lastName}],cc:[],bcc:[]}), hubspot_owner_id(担当者ID)"),
    associations: z.array(z.object({
      to: z.object({ id: z.string().describe("関連先レコードID") }).describe("関連先レコード"),
      types: z.array(z.object({
        associationCategory: z.enum(["HUBSPOT_DEFINED", "USER_DEFINED"]).describe("HUBSPOT_DEFINED=標準ラベル / USER_DEFINED=カスタムラベル（公式仕様準拠）"),
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
