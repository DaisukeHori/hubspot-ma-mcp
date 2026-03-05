import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getHubSpotToken } from "@/lib/hubspot/auth-context";
import { HubSpotError } from "@/lib/hubspot/errors";

const BASE_URL = "https://api.hubapi.com";

async function fetchJson<T>(url: string, options: RequestInit): Promise<T> {
  const response = await fetch(url, options);
  if (!response.ok) {
    let message = response.statusText;
    try { const body = await response.json(); message = body.message || JSON.stringify(body); } catch { /* ignore */ }
    throw new HubSpotError(message, response.status);
  }
  return response.json() as Promise<T>;
}

function getHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${getHubSpotToken()}`,
    "Content-Type": "application/json",
  };
}

export function registerFormCreate(server: McpServer) {
  server.tool(
    "form_create",
    `HubSpot にマーケティングフォームを新規作成する。セミナー申込・お問い合わせ・資料請求等のリードキャプチャフォームを作成可能。

返却: 作成されたフォームのID（UUID）, name, formType, fieldGroups, configuration。
フォームのフィールドはfieldGroupsで定義する。各フィールドにはobjectTypeId（0-1=コンタクト, 0-2=会社）とname（HubSpotプロパティ内部名）を指定。
フィールドのnameは既存のHubSpotプロパティ名と一致する必要がある（properties_listで確認）。`,
    {
      name: z.string().describe("フォーム名（例: 'セミナー申込フォーム 2026年4月'）"),
      formType: z.enum(["hubspot", "captured", "flow", "blog_comment"]).optional().describe("フォームタイプ（デフォルト: hubspot）。hubspot=通常フォーム, flow=ポップアップ, captured=外部HTML, blog_comment=ブログコメント"),
      fieldGroups: z.array(z.object({
        groupType: z.string().optional().describe("グループタイプ（default_group / default）"),
        richTextType: z.string().optional().describe("リッチテキストタイプ（text / image）"),
        richText: z.string().optional().describe("フィールドグループ上部に表示するリッチテキスト（HTML）"),
        fields: z.array(z.object({
          objectTypeId: z.string().describe("対象オブジェクトタイプID。0-1=コンタクト, 0-2=会社, 0-3=取引, 0-5=チケット"),
          name: z.string().describe("HubSpotプロパティの内部名（例: email, firstname, lastname, phone, company）。properties_listで確認可能"),
          label: z.string().describe("フォーム上の表示ラベル（例: 'メールアドレス', 'お名前'）"),
          fieldType: z.string().describe("フィールドの入力タイプ。email, single_line_text, multi_line_text, number, phone_number, dropdown, single_checkbox, multiple_checkboxes, radio, datepicker, file"),
          required: z.boolean().describe("必須フィールドかどうか"),
          hidden: z.boolean().optional().describe("非表示フィールドかどうか（デフォルト false）。UTMパラメータ等の隠しフィールドに使用"),
          placeholder: z.string().optional().describe("プレースホルダーテキスト（例: 'example@email.com'）"),
          description: z.string().optional().describe("フィールド下部のヘルプテキスト"),
          defaultValue: z.string().optional().describe("デフォルト値（hidden=trueの場合に特に有用）"),
        })).describe("フィールド定義の配列。各フィールドはHubSpotプロパティにマッピングされる"),
      })).describe("フィールドグループの配列。各グループには1つ以上のフィールドを含む。1行に複数フィールドを並べるには同一グループ内に配置"),
      configuration: z.object({
        language: z.string().optional().describe("フォームの言語コード（例: 'ja', 'en'）"),
        cloneable: z.boolean().optional().describe("フォームの複製を許可するか"),
        editable: z.boolean().optional().describe("フォームの編集を許可するか"),
        postSubmitAction: z.object({
          type: z.enum(["thank_you", "redirect"]).describe("送信後アクション。thank_you=お礼メッセージ表示, redirect=URL転送"),
          value: z.string().describe("thank_you: お礼メッセージテキスト。redirect: 転送先URL"),
        }).optional().describe("フォーム送信後のアクション設定"),
        lifecycleStages: z.array(z.object({
          objectTypeId: z.string().describe("オブジェクトタイプ（0-1=コンタクト, 0-2=会社）"),
          value: z.string().describe("ライフサイクルステージ（subscriber, lead, marketingqualifiedlead, salesqualifiedlead, opportunity, customer）"),
        })).optional().describe("フォーム送信時に設定するライフサイクルステージ。コンタクト(0-1)と会社(0-2)の両方を指定する必要がある"),
      }).optional().describe("フォームの設定（言語、送信後アクション、ライフサイクルステージ等）"),
    },
    async ({ name, formType, fieldGroups, configuration }) => {
      try {
        const body: Record<string, unknown> = {
          name,
          formType: formType ?? "hubspot",
          fieldGroups,
        };
        if (configuration) body.configuration = configuration;

        const result = await fetchJson<Record<string, unknown>>(
          `${BASE_URL}/marketing/v3/forms`,
          {
            method: "POST",
            headers: getHeaders(),
            body: JSON.stringify(body),
          }
        );

        return {
          content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        const message = error instanceof HubSpotError
          ? `HubSpot API エラー (${error.status}): ${error.message}`
          : String(error);
        return { content: [{ type: "text" as const, text: message }], isError: true };
      }
    }
  );
}
