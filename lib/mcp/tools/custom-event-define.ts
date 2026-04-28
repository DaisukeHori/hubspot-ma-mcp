/**
 * custom_event_define ツール
 * HubSpot カスタムイベント定義（スキーマ）を新規作成する。
 *
 * 公式OpenAPI spec: ExternalBehavioralEventTypeDefinitionEgg
 *   required: ['includeDefaultProperties', 'label', 'propertyDefinitions']
 *   - label, includeDefaultProperties, propertyDefinitions の3つは必須
 *   - name, description, primaryObject, customMatchingId は optional
 *
 * 関連スキーマ:
 *   - ExternalBehavioralEventPropertyCreate.required = ['label', 'type']
 *   - ExternalBehavioralEventPropertyCreate.type の enum = [string, number, enumeration, datetime]
 *   - ExternalObjectResolutionMappingRequest.required = ['primaryObjectRule']
 *   - ExternalPrimaryObjectResolutionRule.required = ['eventPropertyName', 'targetObjectPropertyName']
 *
 * 2026-04-28 修正: 公式OpenAPI spec の required と enum に合わせて完全書き直し。
 *   - includeDefaultProperties / propertyDefinitions を required に変更
 *   - propertyDefinitions[].type を z.enum(["string","number","enumeration","datetime"]) に厳密化
 *   - propertyDefinitions[].label を required（公式仕様 ExternalBehavioralEventPropertyCreate.required）
 *   - customMatchingId.primaryObjectRule を required に変更
 *
 * 公式仕様の参照先:
 *   PublicApiSpecs/Events/Manage Event Definitions/Rollouts/138888/v3/manageEventDefinitions.json
 */

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
    throw new HubSpotError(response.status, message);
  }
  return response.json() as Promise<T>;
}

function getHeaders(): Record<string, string> {
  return { Authorization: `Bearer ${getHubSpotToken()}`, "Content-Type": "application/json" };
}

export function registerCustomEventDefine(server: McpServer) {
  server.tool(
    "custom_event_define",
    `HubSpot カスタムイベント定義（スキーマ）を新規作成する。「セミナー参加」「資料ダウンロード」等のビジネス固有イベントの構造を定義。

返却: fullyQualifiedName（custom_event_sendで使用するイベント名）, name, label, primaryObject, propertyDefinitions。

【必須項目（公式OpenAPI spec準拠）】
- label: イベントの表示名
- includeDefaultProperties: デフォルトプロパティ（hs_city等）を含めるか
- propertyDefinitions: カスタムプロパティ定義の配列（最低1つは必要、空配列でも可）

【propertyDefinitions の各項目】
- label, type は必須（type は string/number/enumeration/datetime のいずれか）

制限: アカウントあたり最大500イベント定義。
スコープ: behavioral_events.event_definitions.read_write`,
    {
      label: z
        .string()
        .describe("イベントの表示名（例: 'セミナー参加', '資料ダウンロード'）"),
      includeDefaultProperties: z
        .boolean()
        .describe(
          "デフォルトプロパティ（hs_city, hs_country等）を含めるか。" +
            "公式仕様で必須。通常 true で良い"
        ),
      propertyDefinitions: z
        .array(
          z.object({
            label: z.string().describe("プロパティ表示名"),
            type: z
              .enum(["string", "number", "enumeration", "datetime"])
              .describe(
                "型（公式OpenAPI spec準拠の4値）: string=文字列, number=数値, enumeration=列挙型（optionsを併用）, datetime=日時"
              ),
            name: z
              .string()
              .optional()
              .describe(
                "プロパティ内部名（英数字アンダースコア小文字のみ）。省略時はlabelから自動生成"
              ),
            description: z.string().optional().describe("プロパティの説明"),
            options: z
              .array(
                z.object({
                  label: z.string().describe("選択肢の表示名"),
                  value: z.string().describe("選択肢の内部値"),
                  hidden: z
                    .boolean()
                    .optional()
                    .describe(
                      "UI上で非表示にするか（公式OptionInput.required）。デフォルト false"
                    ),
                  displayOrder: z
                    .number()
                    .optional()
                    .describe("表示順（公式OptionInput.required）。0始まり"),
                  description: z.string().optional().describe("選択肢の説明"),
                })
              )
              .optional()
              .describe(
                "type=enumeration の場合のみ指定する選択肢。他のtypeでは無視される"
              ),
          })
        )
        .describe(
          "カスタムプロパティ定義の配列。イベント固有のデータ項目（例: セミナー名、参加方法等）。" +
            "公式仕様で必須（空配列でも可）"
        ),
      name: z
        .string()
        .optional()
        .describe(
          "イベントの内部名（英数字アンダースコアのみ。例: 'seminar_attendance'）。" +
            "省略時はlabelから自動生成。自動的にプレフィックス付きのfullyQualifiedNameが生成される"
        ),
      primaryObject: z
        .enum(["CONTACT", "COMPANY", "DEAL", "TICKET"])
        .optional()
        .describe(
          "関連付けるオブジェクトタイプ。省略時は CONTACT 扱いになる場合あり"
        ),
      description: z.string().optional().describe("イベントの説明"),
      customMatchingId: z
        .object({
          primaryObjectRule: z
            .object({
              eventPropertyName: z
                .string()
                .describe("マッチングに使うイベントプロパティ名"),
              targetObjectPropertyName: z
                .string()
                .describe("マッチング対象のCRMオブジェクトプロパティ名"),
            })
            .describe(
              "公式仕様 ExternalPrimaryObjectResolutionRule（eventPropertyName と targetObjectPropertyName 両方必須）"
            ),
        })
        .optional()
        .describe(
          "カスタムマッチングルール。イベントプロパティ値でCRMレコードを特定する場合に使用" +
            "（例: イベントの email_address プロパティでコンタクトの email にマッチ）"
        ),
    },
    async ({
      label,
      includeDefaultProperties,
      propertyDefinitions,
      name,
      primaryObject,
      description,
      customMatchingId,
    }) => {
      try {
        // 公式仕様 ExternalBehavioralEventTypeDefinitionEgg.required の3項目は常に送信
        const body: Record<string, unknown> = {
          label,
          includeDefaultProperties,
          propertyDefinitions,
        };
        if (name) body.name = name;
        if (primaryObject) body.primaryObject = primaryObject;
        if (description) body.description = description;
        if (customMatchingId) body.customMatchingId = customMatchingId;

        const result = await fetchJson<Record<string, unknown>>(
          `${BASE_URL}/events/v3/event-definitions`,
          { method: "POST", headers: getHeaders(), body: JSON.stringify(body) }
        );
        return {
          content: [
            { type: "text" as const, text: JSON.stringify(result, null, 2) },
          ],
        };
      } catch (error) {
        const message =
          error instanceof HubSpotError
            ? `HubSpot API エラー (${error.status}): ${error.message}`
            : String(error);
        return {
          content: [{ type: "text" as const, text: message }],
          isError: true,
        };
      }
    }
  );
}
