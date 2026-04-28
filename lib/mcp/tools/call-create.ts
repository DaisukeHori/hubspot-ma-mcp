import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { crmCreate } from "@/lib/hubspot/crm-client";

export function registerCallCreate(server: McpServer) {
  server.tool(
  "call_create",
  `新しい通話エンゲージメント（通話履歴）を作成する。
コンタクト・会社・取引・チケットのタイムラインに表示される手動ログ。
電話システム連携で通話結果を記録するための主要なツール。

properties は必ず hs_timestamp（ISO 8601 または Unix ミリ秒）を含むこと。
hs_call_status は11値のenum: BUSY / CALLING_CRM_USER / CANCELED / COMPLETED / CONNECTING /
FAILED / IN_PROGRESS / NO_ANSWER / QUEUED / RINGING / IN_PROGRESS。
hs_call_direction は INBOUND / OUTBOUND。
返却: id, properties, createdAt。
よくある関連タイプID: 194=call→contact, 182=call→company, 206=call→deal, 220=call→ticket。
公式: POST /crm/v3/objects/calls`,
  {
    properties: z.record(z.string()).describe("通話のプロパティ（キー:値）。hs_timestampは必須。主要プロパティ: hs_call_title, hs_call_body, hs_call_duration(ミリ秒), hs_call_direction(INBOUND/OUTBOUND), hs_call_status(BUSY/CALLING_CRM_USER/CANCELED/COMPLETED/CONNECTING/FAILED/IN_PROGRESS/NO_ANSWER/QUEUED/RINGING), hs_call_from_number, hs_call_to_number, hs_call_recording_url(HTTPS .mp3/.wav), hubspot_owner_id, hs_activity_type(通話タイプ)。hs_call_disposition(結果GUID): Busy=9d9162e7-6cf3-4944-bf63-4dff82258764, Connected=f240bbac-87c9-4f6e-bf70-924b57d47db7, Left live message=a4c4c377-d246-4b32-a13b-75a56a4cd0ff, Left voicemail=b2cf5968-551e-4856-9783-52b3da59a7d0, No answer=73a0d17f-1163-4015-bdd5-ec830791da20, Wrong number=17b47fee-58de-441e-a44c-c6300d46f273"),
    associations: z.array(z.object({
      to: z.object({ id: z.string().describe("関連先レコードID") }).describe("関連先レコード"),
      types: z.array(z.object({
        associationCategory: z.enum(["HUBSPOT_DEFINED", "USER_DEFINED"]).describe("HUBSPOT_DEFINED=標準ラベル / USER_DEFINED=カスタムラベル（公式仕様準拠）"),
        associationTypeId: z.number().describe("関連タイプID。association_labelsツールのlistで取得可能"),
      })).describe("関連タイプ定義の配列"),
    })).optional().describe("関連付け先レコードの配列"),
  },
  async ({ properties, associations }) => {
    const result = await crmCreate("calls", properties, associations);
    return {
      content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
    };
  }
);
}
