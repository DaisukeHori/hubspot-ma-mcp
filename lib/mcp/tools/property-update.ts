/**
 * property_update ツール
 * 既存のカスタムプロパティの定義を更新する。
 *
 * 公式OpenAPI spec: PropertyUpdate
 *   required: [] （全optional、PATCHで部分更新）
 *   - type, name は更新不可（PropertyCreate にはあるが PropertyUpdate には無い）
 *   - fieldType, label, description, groupName, options, hidden, formField, displayOrder,
 *     dataSensitivity, numberDisplayHint, showCurrencySymbol, currencyPropertyName,
 *     calculationFormula は更新可
 *   - fieldType の enum (12値): booleancheckbox, calculation_equation, checkbox, date,
 *     file, html, number, phonenumber, radio, select, text, textarea
 *   - options[] (OptionInput): required = ['hidden', 'label', 'value']
 *
 * 2026-04-28 修正: 公式OpenAPI spec のenum値に合わせて拡充。
 *   - fieldType を z.enum() に厳密化
 *   - options[].hidden を必須に追加
 *   - dataSensitivity, numberDisplayHint, hidden, formField, displayOrder 等を追加
 *
 * 公式仕様の参照先:
 *   PublicApiSpecs/CRM/Properties/Rollouts/145899/v3/properties.json
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { updateProperty } from "../../hubspot/crm-client";

export function registerPropertyUpdate(server: McpServer) {
  server.tool(
    "property_update",
    `HubSpot プロパティの定義を更新する（PATCH=部分更新）。
label、description、groupName、選択肢（options）等の変更が可能。
注意: type, name は更新不可（公式仕様 PropertyUpdate にも含まれない）。`,
    {
      objectType: z
        .string()
        .describe(
          "対象オブジェクトタイプ: contacts, companies, deals, tickets, line_items, products / カスタムオブジェクトID"
        ),
      propertyName: z.string().describe("プロパティ内部名"),
      label: z.string().optional().describe("新しい表示ラベル名"),
      description: z
        .string()
        .optional()
        .describe("新しいプロパティ説明文（UIに表示される）"),
      groupName: z.string().optional().describe("新しいグループ名"),
      fieldType: z
        .enum([
          "booleancheckbox",
          "calculation_equation",
          "checkbox",
          "date",
          "file",
          "html",
          "number",
          "phonenumber",
          "radio",
          "select",
          "text",
          "textarea",
        ])
        .optional()
        .describe(
          "フィールド種別（公式OpenAPI spec準拠の12値）: " +
            "booleancheckbox=単一チェックボックス（はい/いいえ）, " +
            "calculation_equation=計算式（calculationFormulaと併用）, " +
            "checkbox=複数選択チェックボックス, " +
            "date=日付ピッカー, " +
            "file=ファイルアップロード, " +
            "html=リッチテキスト/HTML, " +
            "number=数値入力, " +
            "phonenumber=電話番号, " +
            "radio=ラジオボタン（単一選択）, " +
            "select=ドロップダウン（単一選択）, " +
            "text=1行テキスト, " +
            "textarea=複数行テキスト。" +
            "type自体は変更不可だが、互換性のあるfieldTypeなら変更可能（例: select↔radio）"
        ),
      hidden: z.boolean().optional().describe("UIで非表示にするか"),
      formField: z
        .boolean()
        .optional()
        .describe("フォームで利用可能にするか"),
      displayOrder: z
        .number()
        .int()
        .optional()
        .describe("表示順（負の値で末尾）"),
      numberDisplayHint: z
        .enum([
          "currency",
          "duration",
          "formatted",
          "percentage",
          "probability",
          "unformatted",
        ])
        .optional()
        .describe(
          "数値表示ヒント（公式OpenAPI spec準拠の6値）: " +
            "currency=通貨表記（showCurrencySymbol/currencyPropertyName と併用）, " +
            "duration=期間表記（時:分:秒）, " +
            "formatted=区切り記号付き数値, " +
            "percentage=パーセント表記, " +
            "probability=確率表記, " +
            "unformatted=書式なし整数。" +
            "type=number のときのみ有効。"
        ),
      showCurrencySymbol: z
        .boolean()
        .optional()
        .describe("通貨記号を表示するか"),
      currencyPropertyName: z
        .string()
        .optional()
        .describe("関連付ける通貨プロパティ名"),
      calculationFormula: z
        .string()
        .optional()
        .describe("計算式（fieldType=calculation_equation時）"),
      options: z
        .array(
          z.object({
            label: z.string().describe("選択肢の表示名（例: 'Aランク'）"),
            value: z
              .string()
              .describe("選択肢の内部値（例: 'rank_a'。英数字推奨）"),
            hidden: z
              .boolean()
              .describe(
                "UIで非表示にするか（公式OpenAPI spec の OptionInput.required）"
              ),
            displayOrder: z
              .number()
              .int()
              .optional()
              .describe(
                "表示順（0始まり。小さいほど先に表示）。公式仕様では optional"
              ),
            description: z.string().optional().describe("選択肢の説明"),
          })
        )
        .optional()
        .describe(
          "選択肢の配列（type=enumeration用）。各要素に label, value, hidden が必須"
        ),
    },
    async ({ objectType, propertyName, ...updates }) => {
      const cleanUpdates = Object.fromEntries(
        Object.entries(updates).filter(([, v]) => v !== undefined)
      );
      const result = await updateProperty(objectType, propertyName, cleanUpdates);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }
  );
}
