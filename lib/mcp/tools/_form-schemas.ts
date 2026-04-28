/**
 * form-create / form-update で共有する Zod スキーマ定義
 *
 * 2026-04-28 に実物フォーム（4月C入門講座 8da1a71a-848a-4f5e-998b-2ac4a0e6e255）の
 * form_get レスポンス構造に基づき作成。
 *
 * 全ての object スキーマには .passthrough() を入れて、HubSpot API が将来追加するフィールドや
 * ここで明示していない隠しフィールドを素通しできるようにしている。
 *
 * このファイルは「ツール本体ではない」ため、アンダースコアプレフィックスで命名しており
 * server.ts からは register* 関数を持たないため import されない。
 */

import { z } from "zod";

/** validation オブジェクト（fieldType ごとに形が違うため両方の形を許容） */
export const ValidationSchema = z
  .object({
    // email
    blockedEmailDomains: z.array(z.string()).optional(),
    useDefaultBlockList: z.boolean().optional(),
    // phone
    minAllowedDigits: z.number().optional(),
    maxAllowedDigits: z.number().optional(),
  })
  .passthrough();

/** radio / checkbox / dropdown の選択肢 */
export const OptionSchema = z
  .object({
    label: z.string().describe("表示ラベル"),
    value: z.string().describe("内部値（HubSpotプロパティに保存される値）"),
    description: z.string().optional().describe("説明（通常は空文字）"),
    displayOrder: z
      .number()
      .optional()
      .describe("表示順（0が先頭、1, 2, ...）"),
  })
  .passthrough();

/** フィールド定義 */
export const FieldSchema = z
  .object({
    objectTypeId: z
      .string()
      .describe(
        "対象オブジェクトタイプID。0-1=コンタクト, 0-2=会社, 0-3=取引, 0-5=チケット"
      ),
    name: z
      .string()
      .describe(
        "HubSpotプロパティの内部名（例: email, firstname, lastname, phone, company）。properties_listで確認可能"
      ),
    label: z
      .string()
      .describe("フォーム上の表示ラベル（例: 'メールアドレス', 'お名前'）"),
    fieldType: z
      .string()
      .describe(
        "フィールドの入力タイプ。email, single_line_text, multi_line_text, number, phone, dropdown, single_checkbox, multiple_checkboxes, radio, datepicker, file"
      ),
    required: z.boolean().describe("必須フィールドかどうか"),
    hidden: z
      .boolean()
      .optional()
      .describe(
        "非表示フィールドかどうか（デフォルト false）。UTMパラメータ等の隠しフィールドに使用"
      ),
    placeholder: z
      .string()
      .optional()
      .describe("プレースホルダーテキスト（例: 'example@email.com'）"),
    description: z
      .string()
      .optional()
      .describe("フィールド下部のヘルプテキスト"),
    defaultValue: z
      .string()
      .optional()
      .describe(
        "デフォルト値（hidden=true の hidden フィールドや datepicker 等で使用）"
      ),
    defaultValues: z
      .array(z.string())
      .optional()
      .describe(
        "デフォルト値の配列（radio/checkbox/dropdown など複数値型のフィールドで使用）"
      ),
    options: z
      .array(OptionSchema)
      .optional()
      .describe(
        "選択肢の配列。fieldType が radio / multiple_checkboxes / dropdown の場合に必要"
      ),
    validation: ValidationSchema.optional().describe(
      "入力検証ルール。email では { blockedEmailDomains, useDefaultBlockList }、phone では { minAllowedDigits, maxAllowedDigits }"
    ),
    useCountryCodeSelect: z
      .boolean()
      .optional()
      .describe(
        "国コードセレクタを表示するか（fieldType=phone の場合のみ。デフォルト false）"
      ),
    displayOrder: z
      .number()
      .optional()
      .describe("フィールドの表示順（省略可）"),
    dependentFieldFilters: z
      .array(z.unknown())
      .optional()
      .describe(
        "依存フィールド（条件付き表示）の設定。詳細はHubSpotドキュメント参照"
      ),
  })
  .passthrough();

/** フィールドグループ */
export const FieldGroupSchema = z
  .object({
    groupType: z
      .string()
      .optional()
      .describe("グループタイプ（default_group / default）"),
    richTextType: z
      .string()
      .optional()
      .describe("リッチテキストタイプ（text / image）"),
    richText: z
      .string()
      .optional()
      .describe("フィールドグループ上部に表示するリッチテキスト（HTML）"),
    fields: z
      .array(FieldSchema)
      .optional()
      .describe(
        "フィールド定義の配列。リッチテキストのみのグループでは省略可"
      ),
  })
  .passthrough();

/** postSubmitAction */
export const PostSubmitActionSchema = z
  .object({
    type: z
      .enum(["thank_you", "redirect_url"])
      .describe(
        "送信後アクション。thank_you=お礼メッセージ表示, redirect_url=URL転送"
      ),
    value: z
      .string()
      .describe(
        "thank_you の場合はお礼メッセージテキスト、redirect_url の場合は転送先URL"
      ),
  })
  .passthrough();

/** lifecycleStage 設定 */
export const LifecycleStageSchema = z
  .object({
    objectTypeId: z
      .string()
      .describe("オブジェクトタイプ（0-1=コンタクト, 0-2=会社）"),
    value: z
      .string()
      .describe(
        "ライフサイクルステージ（subscriber, lead, marketingqualifiedlead, salesqualifiedlead, opportunity, customer）"
      ),
  })
  .passthrough();

/** configuration */
export const ConfigurationSchema = z
  .object({
    language: z
      .string()
      .optional()
      .describe("フォームの言語コード（例: 'ja', 'en'）"),
    cloneable: z
      .boolean()
      .optional()
      .describe("フォームの複製を許可するか"),
    editable: z.boolean().optional().describe("フォームの編集を許可するか"),
    archivable: z
      .boolean()
      .optional()
      .describe("フォームのアーカイブを許可するか"),
    postSubmitAction: PostSubmitActionSchema.optional().describe(
      "フォーム送信後のアクション設定"
    ),
    lifecycleStages: z
      .array(LifecycleStageSchema)
      .optional()
      .describe(
        "フォーム送信時に設定するライフサイクルステージ。コンタクト(0-1)と会社(0-2)の両方を指定する必要がある"
      ),
    notifyRecipients: z
      .array(z.string())
      .optional()
      .describe(
        "送信通知の宛先（HubSpotユーザーID または 'team:{teamId}' 形式の配列）。例: ['62049598', 'team:41946038']"
      ),
    recaptchaEnabled: z
      .boolean()
      .optional()
      .describe("reCAPTCHA を有効にするか（デフォルト false）"),
    notifyContactOwner: z
      .boolean()
      .optional()
      .describe("コンタクトのオーナーに通知するか（デフォルト false）"),
    createNewContactForNewEmail: z
      .boolean()
      .optional()
      .describe(
        "未知のメールアドレスを受け取った場合に新規コンタクトを作成するか（デフォルト true）"
      ),
    prePopulateKnownValues: z
      .boolean()
      .optional()
      .describe(
        "既知のコンタクトに対してフィールドを事前入力するか（デフォルト true）"
      ),
    allowLinkToResetKnownValues: z
      .boolean()
      .optional()
      .describe(
        "既知の値をリセットするリンクを表示するか（デフォルト false）"
      ),
    embedType: z
      .enum(["V3", "V4"])
      .optional()
      .describe(
        "埋め込みタイプ。V3=従来のフォームビルダー、V4=新フォームビルダー。新規作成は通常 'V3'。HubSpot側で自動設定される場合もある（公式OpenAPI spec: HubSpotFormConfiguration.embedType enum=['V3','V4']）"
      ),
  })
  .passthrough();

/** displayOptions.style — フォントや色などの細かい指定 */
export const StyleSchema = z
  .record(z.string())
  .describe(
    "スタイル設定（fontFamily, labelTextColor, labelTextSize, helpTextColor, helpTextSize, legalConsentTextColor, legalConsentTextSize, submitColor, submitFontColor, submitSize, submitAlignment, backgroundWidth等）"
  );

/** displayOptions */
export const DisplayOptionsSchema = z
  .object({
    renderRawHtml: z
      .boolean()
      .optional()
      .describe("生HTMLでレンダリングするか（デフォルト false）"),
    theme: z
      .enum(["canvas", "default_style", "legacy", "linear", "round", "sharp"])
      .optional()
      .describe(
        "テーマ。canvas / default_style / legacy / linear / round / sharp の6種から選択（公式OpenAPI spec: FormDisplayOptions.theme enum）。'none' は仕様に存在しないので使えない。"
      ),
    submitButtonText: z
      .string()
      .optional()
      .describe("送信ボタンのテキスト（例: '送信', 'Submit'）"),
    cssClass: z
      .string()
      .optional()
      .describe("CSSクラス名（例: 'hs-form stacked'）"),
    style: StyleSchema.optional(),
  })
  .passthrough();

/** legalConsentOptions（GDPR） */
export const LegalConsentOptionsSchema = z
  .object({
    type: z
      .enum(["none", "legitimate_interest", "consent"])
      .describe(
        "同意タイプ: none=なし, legitimate_interest=正当な利益, consent=明示的同意（GDPR）"
      ),
  })
  .passthrough();
