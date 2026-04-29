/**
 * marketing_email_create ツール
 * HubSpot マーケティングメールを新規作成する。
 *
 * 公式OpenAPI spec: EmailCreateRequest
 *   required: ['name']
 *   公式構造を完全実装:
 *     - name (required)
 *     - subject, archived, jitterSendTime, sendOnPublish, publishDate, language, campaign
 *     - businessUnitId (integer), folderIdV2 (integer)
 *     - content (PublicEmailContent: templatePath, plainTextVersion, widgets, widgetContainers, smartFields, styleSettings, themeSettingsValues, flexAreas)
 *     - from (PublicEmailFromDetails: fromName, replyTo, customReplyTo)
 *     - to (PublicEmailToDetails: contactIds/contactLists/contactIlsLists の include/exclude, limitSendFrequency, suppressGraymail)
 *     - subscriptionDetails (PublicEmailSubscriptionDetails: subscriptionId, subscriptionName, officeLocationId, preferencesGroupId)
 *     - testing, webversion, rssData
 *     - state (enum 32値), subcategory (enum 78値) は z.string() で受ける
 *
 * 2026-04-28 修正: 公式OpenAPI spec の構造に合わせて完全書き直し。
 *   - 旧 to.contactIdsInclude/Exclude は公式仕様と異なる構造だった（実際は to.contactIds.include/exclude）
 *   - 旧 from.fromAddress は公式仕様に存在しない（PublicEmailFromDetailsに無い）
 *   - 旧 templatePath はトップレベル指定だったが、公式仕様では content.templatePath
 *
 * 公式仕様の参照先:
 *   PublicApiSpecs/Marketing/Marketing Emails/Rollouts/145892/v3/marketingEmails.json
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getHubSpotToken } from "@/lib/hubspot/auth-context";
import { HubSpotError } from "@/lib/hubspot/errors";
import { formatToolResult, prettyParam } from "@/lib/mcp/utils/format-result";

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

/** PublicEmailRecipients: include/exclude 形式 */
const RecipientsSchema = z
  .object({
    include: z
      .array(z.string())
      .optional()
      .describe("含めるID（コンタクトID/リストID/ILSリストIDなど）の配列"),
    exclude: z
      .array(z.string())
      .optional()
      .describe("除外するIDの配列"),
  })
  .passthrough();

export function registerMarketingEmailCreate(server: McpServer) {
  server.tool(
    "marketing_email_create",
    `HubSpot マーケティングメールを新規作成する。ニュースレター、キャンペーンメール、セミナー告知メール等をDRAFT状態で作成。

返却: 作成されたメールのid, name, subject, state(DRAFT), content構造。
作成後はmarketing_email_updateで内容を編集し、marketing_email_publishで送信可能（Enterprise or transactional add-on必要）。

【公式必須項目】
- name のみ必須

【推奨ワークフロー】
既存メールをmarketing_email_getで取得→構造を参考にcreateまたはmarketing_email_cloneで複製。
メール本文は content.widgets / content.widgetContainers / content.flexAreas に設定。
content.templatePath でDnDテンプレートを指定可能（旧形式の templatePath トップレベル指定は公式仕様にない）。

【宛先設定（to）】
公式仕様 PublicEmailToDetails:
  - contactIds.include / contactIds.exclude: コンタクトID単位
  - contactLists.include / contactLists.exclude: 静的リストID単位
  - contactIlsLists.include / contactIlsLists.exclude: ILSリスト（v3 Lists）単位
  - limitSendFrequency: 送信頻度制限
  - suppressGraymail: グレイメール抑制`,
    {
      // ── 必須 ──
      name: z
        .string()
        .describe("メール名（内部管理用。例: 'セミナー告知 2026年4月'）"),

      // ── 主要 optional ──
      subject: z
        .string()
        .optional()
        .describe(
          "メール件名（受信者に表示される。例: '【レヴォル】4月セミナーのご案内'）"
        ),
      content: z
        .object({
          templatePath: z
            .string()
            .optional()
            .describe(
              "メールテンプレートパス（例: '@hubspot/email/dnd/welcome.html'）"
            ),
          plainTextVersion: z
            .string()
            .optional()
            .describe("プレーンテキスト版本文"),
          widgets: z
            .record(z.unknown())
            .optional()
            .describe(
              "テンプレート直下のwidget定義（widgetId → widget オブジェクト）"
            ),
          widgetContainers: z
            .record(z.unknown())
            .optional()
            .describe("flex column 内のwidget container定義"),
          flexAreas: z
            .record(z.unknown())
            .optional()
            .describe("flex area定義（DnDテンプレート用）"),
          smartFields: z
            .record(z.unknown())
            .optional()
            .describe("Smart Field（パーソナライゼーション）設定"),
          styleSettings: z
            .record(z.unknown())
            .optional()
            .describe(
              "PublicEmailStyleSettings（背景色、フォント、ボタン等のスタイル）"
            ),
          themeSettingsValues: z
            .record(z.unknown())
            .optional()
            .describe("テーマ設定値"),
        })
        .passthrough()
        .optional()
        .describe(
          "メール本文の構造（公式仕様 PublicEmailContent）。" +
            "既存メールをmarketing_email_getで取得し、そのcontent構造を参考にすることを推奨"
        ),
      from: z
        .object({
          fromName: z.string().optional().describe("送信者名（例: 'レヴォル株式会社'）"),
          replyTo: z
            .string()
            .optional()
            .describe(
              "返信先メールアドレス（公式仕様 PublicEmailFromDetails.replyTo）"
            ),
          customReplyTo: z
            .string()
            .optional()
            .describe("カスタム返信先メールアドレス"),
        })
        .passthrough()
        .optional()
        .describe(
          "送信者情報（公式仕様 PublicEmailFromDetails）。" +
            "注意: fromAddress フィールドは公式仕様に存在しない"
        ),
      to: z
        .object({
          contactIds: RecipientsSchema.optional().describe(
            "コンタクトID単位の宛先指定。{include: [\"id1\",\"id2\"], exclude: [...]}"
          ),
          contactLists: RecipientsSchema.optional().describe(
            "静的リストID単位の宛先指定"
          ),
          contactIlsLists: RecipientsSchema.optional().describe(
            "ILSリスト（v3 Lists API）単位の宛先指定。include/exclude 形式"
          ),
          limitSendFrequency: z
            .boolean()
            .optional()
            .describe("送信頻度制限を適用するか"),
          suppressGraymail: z
            .boolean()
            .optional()
            .describe("グレイメール（半同意ユーザー）を抑制するか"),
        })
        .passthrough()
        .optional()
        .describe(
          "宛先設定（公式仕様 PublicEmailToDetails）。include/exclude 形式に注意"
        ),

      // ── オプショナル：購読・バンダリング・配信制御 ──
      subscriptionDetails: z
        .object({
          subscriptionId: z
            .string()
            .optional()
            .describe(
              "サブスクリプションタイプID（受信者がオプトインしているもの）。間違えると配信事故の温床なので必ず確認"
            ),
          subscriptionName: z
            .string()
            .optional()
            .describe("サブスクリプション名"),
          officeLocationId: z
            .string()
            .optional()
            .describe(
              "オフィスロケーションID（フッター住所に使用、CAN-SPAM対応）"
            ),
          preferencesGroupId: z
            .string()
            .optional()
            .describe("購読設定グループID"),
        })
        .passthrough()
        .optional()
        .describe(
          "購読設定（公式仕様 PublicEmailSubscriptionDetails）。配信先サブスクリプションタイプを指定"
        ),
      businessUnitId: z
        .number()
        .int()
        .optional()
        .describe(
          "Business Unit ID（複数ブランド運用時、Enterpriseのみ）。整数"
        ),
      campaign: z
        .string()
        .optional()
        .describe("キャンペーンGUID。campaign_listで取得可能"),
      folderIdV2: z
        .number()
        .int()
        .optional()
        .describe("フォルダID（メール整理用）"),
      language: z
        .string()
        .optional()
        .describe(
          "言語コード（例: 'ja', 'en', 'en-gb'）。公式OpenAPI specには843種のenum定義がある（細かすぎるためz.string()のまま受ける）"
        ),
      jitterSendTime: z
        .boolean()
        .optional()
        .describe("送信時刻をジッタリング（分散）するか"),
      sendOnPublish: z
        .boolean()
        .optional()
        .describe("publish時に即送信するか"),
      publishDate: z
        .string()
        .optional()
        .describe("公開日時（ISO 8601）"),
      archived: z
        .boolean()
        .optional()
        .describe("アーカイブ状態にするか"),

      // ── 高度なオブジェクト ──
      testing: z
        .record(z.unknown())
        .optional()
        .describe(
          "A/Bテスト設定（公式仕様 PublicEmailTestingDetails: abSampleSizeDefault, abSamplingDefault, abStatus, abSuccessMetric, abTestPercentage, hoursToWait, isAbVariation, testId）"
        ),
      webversion: z
        .record(z.unknown())
        .optional()
        .describe(
          "Webバージョン設定（公式仕様 PublicWebversionDetails: domain, slug, title, metaDescription, expiresAt 等）"
        ),
      rssData: z
        .record(z.unknown())
        .optional()
        .describe("RSSメール設定（公式仕様 PublicRssEmailDetails）"),
      feedbackSurveyId: z
        .string()
        .optional()
        .describe("フィードバック調査ID（NPS/CES連動）"),
      activeDomain: z
        .string()
        .optional()
        .describe("送信元ドメイン"),

      // ── パススルー ──
      additionalProperties: z
        .record(z.unknown())
        .optional()
        .describe(
          "その他の追加プロパティ。state（enum 32値）, subcategory（enum 78値）等を直接渡したい場合に使用"
        ),
    
      pretty: prettyParam,
},
    async ({
      name,
      subject,
      content,
      from,
      to,
      subscriptionDetails,
      businessUnitId,
      campaign,
      folderIdV2,
      language,
      jitterSendTime,
      sendOnPublish,
      publishDate,
      archived,
      testing,
      webversion,
      rssData,
      feedbackSurveyId,
      activeDomain,
      additionalProperties, pretty,
    }) => {
      try {
        const body: Record<string, unknown> = { name };
        if (subject !== undefined) body.subject = subject;
        if (content !== undefined) body.content = content;
        if (from !== undefined) body.from = from;
        if (to !== undefined) body.to = to;
        if (subscriptionDetails !== undefined)
          body.subscriptionDetails = subscriptionDetails;
        if (businessUnitId !== undefined) body.businessUnitId = businessUnitId;
        if (campaign !== undefined) body.campaign = campaign;
        if (folderIdV2 !== undefined) body.folderIdV2 = folderIdV2;
        if (language !== undefined) body.language = language;
        if (jitterSendTime !== undefined) body.jitterSendTime = jitterSendTime;
        if (sendOnPublish !== undefined) body.sendOnPublish = sendOnPublish;
        if (publishDate !== undefined) body.publishDate = publishDate;
        if (archived !== undefined) body.archived = archived;
        if (testing !== undefined) body.testing = testing;
        if (webversion !== undefined) body.webversion = webversion;
        if (rssData !== undefined) body.rssData = rssData;
        if (feedbackSurveyId !== undefined)
          body.feedbackSurveyId = feedbackSurveyId;
        if (activeDomain !== undefined) body.activeDomain = activeDomain;
        if (additionalProperties) Object.assign(body, additionalProperties);

        const result = await fetchJson<Record<string, unknown>>(
          `${BASE_URL}/marketing/v3/emails`,
          { method: "POST", headers: getHeaders(), body: JSON.stringify(body) }
        );
        return {
          content: [
            { type: "text" as const, text: formatToolResult(result, pretty) },
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
