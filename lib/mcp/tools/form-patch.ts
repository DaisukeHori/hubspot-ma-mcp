/**
 * form_patch ツール
 * HubSpot フォームの定義を「部分更新」する（PATCH /marketing/v3/forms/{formId}）。
 *
 * 既存の form_update（PUT＝全体置換）と違い、リクエストボディに含めたフィールドだけが
 * 上書きされる。configuration の中の notifyRecipients / createNewContactForNewEmail だけを
 * 変更したい、といった「部分更新」用途のために追加された。
 *
 * 公式仕様:
 *   PATCH /marketing/v3/forms/{formId}
 *   "Partially update a form definition"
 *   "Update some of the form definition components"
 *   https://developers.hubspot.com/docs/api-reference/marketing-forms-v3/forms/patch-marketing-v3-forms-formId
 *
 * 設計上の決定:
 *   - formId 以外は全て optional。undefined のフィールドはリクエストボディに含めない。
 *     これにより「configuration だけ送る」「name だけ変える」といった最小ボディが成立する。
 *   - fieldGroups を省略した場合、HubSpot 側の既存フィールド構成は保持される（PATCH の挙動）。
 *   - form_update（PUT）で問題になっていた field レベルの id/createdAt 自動補完は不要になる
 *     （fieldGroups を送らなければ field の中身を組み立てる必要がそもそも無いため）。
 *   - PATCH の公式 curl 例には updatedAt が含まれていないため、こちらでは自動補完しない。
 *     もし HubSpot 側が要求してきたら別途対応する。
 *
 * 【configuration / displayOptions / legalConsentOptions のクライアントサイドマージ】
 *   2026-04-29 追加: HubSpot Marketing Forms v3 PATCH の実機検証で、
 *   configuration / displayOptions / legalConsentOptions のいずれかを送信すると、
 *   そのサブオブジェクトに含まれていない既存フィールドが「デフォルト値で埋め直される」
 *   挙動（=サブオブジェクト単位の全体置換）が確認された。
 *
 *   例: configuration: { notifyRecipients: [...], createNewContactForNewEmail: true } だけ送ると、
 *       既存の language: "ja" が "en" に、postSubmitAction が thank_you デフォルト値に
 *       リセットされてしまう。
 *
 *   この挙動はツール利用者にとって直感に反するため、本ツールでは PATCH 送信前に form_get で
 *   既存定義を取得し、ユーザー指定の configuration / displayOptions / legalConsentOptions と
 *   既存値をマージしてから HubSpot に送る（クライアントサイドマージ）。
 *
 *   マージ規則:
 *     - configuration: 既存の configuration とユーザー指定の configuration をシャローマージ
 *       （ユーザー指定キーで上書き）。postSubmitAction / lifecycleStages のようなネスト値は
 *       「対セットで意味がある」「配列は順序込みで意味がある」ため、ユーザー指定があれば
 *       オブジェクト/配列全体で置換（マージしない）。
 *     - displayOptions: 既存の displayOptions とユーザー指定をシャローマージ。
 *       特殊ケースとして displayOptions.style はキー単位で更新したい用途が多い（例: submitColor だけ変える）
 *       ため、ユーザー指定の style があれば既存 style とシャローマージ。
 *     - legalConsentOptions: シャローマージ（実質 type 1 フィールドなのでほぼ置換）。
 *
 *   トップレベル（fieldGroups, name, formType, archived）は HubSpot 側で
 *   field 単位の PATCH マージが効くため、本ツールでは触らない（既存挙動どおり）。
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getHubSpotToken } from "@/lib/hubspot/auth-context";
import { HubSpotError } from "@/lib/hubspot/errors";
import { formatToolResult, prettyParam } from "@/lib/mcp/utils/format-result";
import {
  FieldGroupSchema,
  ConfigurationSchema,
  DisplayOptionsSchema,
  LegalConsentOptionsSchema,
} from "./_form-schemas";

const BASE_URL = "https://api.hubapi.com";

async function fetchJson<T>(url: string, options: RequestInit): Promise<T> {
  const response = await fetch(url, options);
  if (!response.ok) {
    let message = response.statusText;
    try {
      const body = await response.json();
      message = body.message || JSON.stringify(body);
    } catch {
      /* ignore */
    }
    throw new HubSpotError(response.status, message);
  }
  return response.json() as Promise<T>;
}

function getHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${getHubSpotToken()}`,
    "Content-Type": "application/json",
  };
}

/**
 * 既存の form 定義から configuration / displayOptions / legalConsentOptions を取得するための型。
 * fieldGroups 等は触らないので unknown のまま。
 */
type FormGetResult = {
  configuration?: Record<string, unknown>;
  displayOptions?: Record<string, unknown> & { style?: Record<string, unknown> };
  legalConsentOptions?: Record<string, unknown>;
  [key: string]: unknown;
};

/**
 * configuration をシャローマージ。
 * ユーザー指定キーで既存値を上書きする。ネスト値（postSubmitAction, lifecycleStages 等）は
 * オブジェクト/配列全体で置換（再帰マージしない）。
 */
function mergeConfiguration(
  existing: Record<string, unknown> | undefined,
  user: Record<string, unknown>
): Record<string, unknown> {
  return { ...(existing ?? {}), ...user };
}

/**
 * displayOptions をシャローマージ。ただし style はサブオブジェクトでさらにシャローマージする
 * （submitColor だけ変えたい等のユースケースに対応）。
 */
function mergeDisplayOptions(
  existing:
    | (Record<string, unknown> & { style?: Record<string, unknown> })
    | undefined,
  user: Record<string, unknown> & { style?: Record<string, unknown> }
): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...(existing ?? {}), ...user };
  if (user.style !== undefined) {
    merged.style = { ...(existing?.style ?? {}), ...user.style };
  }
  return merged;
}

/**
 * legalConsentOptions をシャローマージ。
 * 実質 type 1 フィールドなのでほぼ置換だが、将来の拡張に備えてマージ形にしておく。
 */
function mergeLegalConsentOptions(
  existing: Record<string, unknown> | undefined,
  user: Record<string, unknown>
): Record<string, unknown> {
  return { ...(existing ?? {}), ...user };
}

export function registerFormPatch(server: McpServer) {
  server.tool(
    "form_patch",
    `HubSpot フォームの定義を**部分更新**する（PATCH /marketing/v3/forms/{formId}）。

form_update（PUT＝全体置換）と違い、リクエストボディに含めたフィールドだけが上書きされる。
省略したフィールドグループや設定は既存値が保持される。

主なユースケース:
- configuration の notifyRecipients（通知先メール）や createNewContactForNewEmail だけを変更したい
- name だけ変更したい
- archived を切り替えたい
- displayOptions のみ変更したい

部分更新のため、form_update のように form_get で全体を取得して送り直す必要が無い。
fieldGroups を省略すれば既存のフィールド構成は保持される。

【内部マージ仕様（重要）】
HubSpot Marketing Forms v3 の PATCH は configuration / displayOptions / legalConsentOptions
を送信すると「サブオブジェクト単位で全体置換」する挙動が確認されている
（送信していないフィールドはデフォルト値にリセットされる）。
このツールではユーザーフレンドリーな部分更新を実現するため、PATCH 送信前に
内部で form_get を呼び、既存値とユーザー指定値をマージしてから送る。
- configuration: シャローマージ（ユーザー指定キーで上書き）
- displayOptions: シャローマージ。style はサブオブジェクトで追加マージ
- legalConsentOptions: シャローマージ
そのため「notifyRecipients だけ変えたい」のような最小指定で安全に呼べる。

返却: 更新後のフォーム完全定義。`,
    {
      formId: z
        .string()
        .describe(
          "フォームID（UUID形式）。form_listの返却値のidフィールドから取得。"
        ),
      name: z.string().optional().describe("フォーム名（変更したい場合のみ指定）"),
      formType: z
        .enum(["hubspot", "captured", "flow", "blog_comment"])
        .optional()
        .describe(
          "フォームタイプ（変更したい場合のみ指定）: " +
            "hubspot=通常のマーケティングフォーム / " +
            "captured=外部HTMLフォーム / " +
            "flow=ポップアップフォーム / " +
            "blog_comment=ブログコメントフォーム"
        ),
      fieldGroups: z
        .array(FieldGroupSchema)
        .optional()
        .describe(
          "フィールドグループの配列（**省略時は既存フィールド構成を保持**）。" +
            "指定する場合は全体置換に近い挙動になる点に注意。" +
            "configuration や notifyRecipients だけを更新したいときは省略すること。"
        ),
      configuration: ConfigurationSchema.optional().describe(
        "フォームの設定（言語、送信後アクション、ライフサイクルステージ、通知先 notifyRecipients、" +
          "createNewContactForNewEmail 等）。**部分更新したい場合はここだけ指定すれば足りる**。" +
          "ツール内部で既存 configuration とマージしてから PATCH するため、未指定キーは保持される。"
      ),
      displayOptions: DisplayOptionsSchema.optional().describe(
        "フォームの表示オプション（テーマ・ボタンテキスト・CSSスタイル設定）。" +
          "ツール内部で既存 displayOptions とマージ（style もサブシャローマージ）してから PATCH する。"
      ),
      legalConsentOptions: LegalConsentOptionsSchema.optional().describe(
        "法的同意オプション（GDPR対応。type=none で同意不要）。" +
          "ツール内部で既存 legalConsentOptions とマージしてから PATCH する。"
      ),
      archived: z
        .boolean()
        .optional()
        .describe(
          "アーカイブ状態。true でアーカイブ、false でアクティブに戻す。" +
            "form_delete とは別経路でのアーカイブ切替に使う。"
        ),
      pretty: prettyParam,
    },
    async ({
      formId,
      name,
      formType,
      fieldGroups,
      configuration,
      displayOptions,
      legalConsentOptions,
      archived,
      pretty,
    }) => {
      try {
        // クライアントサイドマージが必要かを判定
        const needsMerge =
          configuration !== undefined ||
          displayOptions !== undefined ||
          legalConsentOptions !== undefined;

        let mergedConfiguration: Record<string, unknown> | undefined =
          configuration;
        let mergedDisplayOptions: Record<string, unknown> | undefined =
          displayOptions;
        let mergedLegalConsentOptions: Record<string, unknown> | undefined =
          legalConsentOptions;

        if (needsMerge) {
          // 既存定義を取得
          const existing = await fetchJson<FormGetResult>(
            `${BASE_URL}/marketing/v3/forms/${formId}`,
            {
              method: "GET",
              headers: getHeaders(),
            }
          );

          if (configuration !== undefined) {
            mergedConfiguration = mergeConfiguration(
              existing.configuration,
              configuration as Record<string, unknown>
            );
          }
          if (displayOptions !== undefined) {
            mergedDisplayOptions = mergeDisplayOptions(
              existing.displayOptions,
              displayOptions as Record<string, unknown> & {
                style?: Record<string, unknown>;
              }
            );
          }
          if (legalConsentOptions !== undefined) {
            mergedLegalConsentOptions = mergeLegalConsentOptions(
              existing.legalConsentOptions,
              legalConsentOptions as Record<string, unknown>
            );
          }
        }

        // PATCH: undefined のフィールドはリクエストボディに含めない
        const body: Record<string, unknown> = {};
        if (name !== undefined) body.name = name;
        if (formType !== undefined) body.formType = formType;
        if (fieldGroups !== undefined) body.fieldGroups = fieldGroups;
        if (mergedConfiguration !== undefined)
          body.configuration = mergedConfiguration;
        if (mergedDisplayOptions !== undefined)
          body.displayOptions = mergedDisplayOptions;
        if (mergedLegalConsentOptions !== undefined)
          body.legalConsentOptions = mergedLegalConsentOptions;
        if (archived !== undefined) body.archived = archived;

        // formId 以外何も指定されていない場合は早期エラー（API を無駄打ちしない）
        if (Object.keys(body).length === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text:
                  "form_patch には formId 以外に少なくとも 1 つの更新対象フィールド" +
                  "（name / formType / fieldGroups / configuration / displayOptions / " +
                  "legalConsentOptions / archived のいずれか）を指定してください。",
              },
            ],
            isError: true,
          };
        }

        const result = await fetchJson<Record<string, unknown>>(
          `${BASE_URL}/marketing/v3/forms/${formId}`,
          {
            method: "PATCH",
            headers: getHeaders(),
            body: JSON.stringify(body),
          }
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
