/**
 * property_create ツール
 * カスタムプロパティを作成する。
 *
 * 公式OpenAPI spec: PropertyCreate
 *   required: ['fieldType', 'groupName', 'label', 'name', 'type']
 *   - type の enum (7値): bool, date, datetime, enumeration, number, phone_number, string
 *   - fieldType の enum (12値): booleancheckbox, calculation_equation, checkbox, date,
 *     file, html, number, phonenumber, radio, select, text, textarea
 *   - dataSensitivity の enum: highly_sensitive, non_sensitive, sensitive
 *   - numberDisplayHint の enum: currency, duration, formatted, percentage, probability, unformatted
 *   - options[] (OptionInput): required = ['hidden', 'label', 'value']（displayOrderは optional）
 *
 * 2026-04-28 修正: 公式OpenAPI spec のenum値に厳密化。
 *   - 旧 type: z.string()（説明文に5値のみ記載）→ 公式7値の z.enum() に変更
 *   - 旧 fieldType: z.string()（説明文に7値のみ記載）→ 公式12値の z.enum() に変更
 *   - 旧 options[].displayOrder は required → 公式仕様では optional
 *   - 旧 options[] には hidden が無かった → 公式仕様で required（追加）
 *
 * 公式仕様の参照先:
 *   PublicApiSpecs/CRM/Properties/Rollouts/145899/v3/properties.json
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createProperty } from "../../hubspot/crm-client";
import { formatToolResult, prettyParam } from "@/lib/mcp/utils/format-result";

export function registerPropertyCreate(server: McpServer) {
  server.tool(
    "property_create",
    `カスタムプロパティを作成する。

【typeとfieldTypeの組み合わせ（公式仕様準拠）】
- 文字列1行: type=string, fieldType=text
- 複数行: type=string, fieldType=textarea
- 数値: type=number, fieldType=number
- 真偽値（チェックボックス）: type=bool, fieldType=booleancheckbox
- 単一選択: type=enumeration, fieldType=select または radio
- 複数選択: type=enumeration, fieldType=checkbox
- 日付: type=date, fieldType=date
- 日時: type=datetime, fieldType=date
- 電話番号: type=phone_number, fieldType=phonenumber
- HTML本文: type=string, fieldType=html
- ファイル: type=string, fieldType=file
- 計算式: type=number/string/datetime, fieldType=calculation_equation`,
    {
      objectType: z
        .string()
        .describe(
          "対象オブジェクト（contacts / companies / deals / tickets / line_items / products / 又はカスタムオブジェクトID）"
        ),
      name: z.string().describe("内部名（英数字・アンダースコアのみ）"),
      label: z.string().describe("UIに表示するラベル名（例: '担当美容師'）"),
      type: z
        .enum([
          "bool",
          "date",
          "datetime",
          "enumeration",
          "number",
          "phone_number",
          "string",
        ])
        .describe(
          "データ型（公式OpenAPI spec準拠の7値）: bool=真偽値, date=日付, datetime=日時, " +
            "enumeration=列挙型, number=数値, phone_number=電話番号, string=文字列"
        ),
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
        .describe(
          "フィールド種別（公式OpenAPI spec準拠の12値）: " +
            "booleancheckbox=真偽値チェック, calculation_equation=計算式, checkbox=複数選択, " +
            "date=日付ピッカー, file=ファイル, html=HTML, number=数値入力, phonenumber=電話番号入力, " +
            "radio=ラジオボタン, select=ドロップダウン, text=1行テキスト, textarea=複数行テキスト"
        ),
      groupName: z.string().describe("プロパティグループ名"),
      description: z
        .string()
        .optional()
        .describe("プロパティの説明文（UIに表示される）"),
      hasUniqueValue: z
        .boolean()
        .optional()
        .describe(
          "ユニーク値制約。trueにすると同じ値を持つレコードを複数作れなくなる。デフォルト: false"
        ),
      hidden: z
        .boolean()
        .optional()
        .describe("UIで非表示にするか"),
      formField: z
        .boolean()
        .optional()
        .describe("フォームで利用可能にするか"),
      displayOrder: z
        .number()
        .int()
        .optional()
        .describe("表示順（負の値で末尾）"),
      dataSensitivity: z
        .enum(["highly_sensitive", "non_sensitive", "sensitive"])
        .optional()
        .describe(
          "データセンシティビティ（公式OpenAPI spec準拠の3値）: " +
            "non_sensitive=通常, sensitive=機微情報, highly_sensitive=高度機微情報"
        ),
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
          "数値表示ヒント（type=number時のみ）: currency=通貨, duration=期間, " +
            "formatted=区切り付き, percentage=パーセント, probability=確率, unformatted=書式なし"
        ),
      showCurrencySymbol: z
        .boolean()
        .optional()
        .describe("通貨記号を表示するか（type=number, numberDisplayHint=currency時）"),
      currencyPropertyName: z
        .string()
        .optional()
        .describe("関連付ける通貨プロパティ名"),
      calculationFormula: z
        .string()
        .optional()
        .describe("計算式（fieldType=calculation_equation時）"),
      referencedObjectType: z
        .string()
        .optional()
        .describe("参照オブジェクトタイプ"),
      externalOptions: z
        .boolean()
        .optional()
        .describe("外部ソースから選択肢を取得するか"),
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
            description: z
              .string()
              .optional()
              .describe("選択肢の説明"),
          })
        )
        .optional()
        .describe("選択肢（type=enumeration の場合）"),
    
      pretty: prettyParam,
},
    async ({
      objectType,
      name,
      label,
      type,
      fieldType,
      groupName,
      description,
      hasUniqueValue,
      hidden,
      formField,
      displayOrder,
      dataSensitivity,
      numberDisplayHint,
      showCurrencySymbol,
      currencyPropertyName,
      calculationFormula,
      referencedObjectType,
      externalOptions,
      options, pretty,
    }) => {
      const result = await createProperty(objectType, {
        name,
        label,
        type,
        fieldType,
        groupName,
        ...(description !== undefined && { description }),
        ...(hasUniqueValue !== undefined && { hasUniqueValue }),
        ...(hidden !== undefined && { hidden }),
        ...(formField !== undefined && { formField }),
        ...(displayOrder !== undefined && { displayOrder }),
        ...(dataSensitivity !== undefined && { dataSensitivity }),
        ...(numberDisplayHint !== undefined && { numberDisplayHint }),
        ...(showCurrencySymbol !== undefined && { showCurrencySymbol }),
        ...(currencyPropertyName !== undefined && { currencyPropertyName }),
        ...(calculationFormula !== undefined && { calculationFormula }),
        ...(referencedObjectType !== undefined && { referencedObjectType }),
        ...(externalOptions !== undefined && { externalOptions }),
        ...(options && { options }),
      });
      return {
        content: [{ type: "text", text: formatToolResult(result, pretty) }],
      };
    }
  );
}
