/**
 * form_create ツール
 * HubSpot にマーケティングフォームを新規作成する。
 *
 * Zod スキーマは 2026-04-28 に実物フォーム（4月C入門講座 8da1a71a-848a-4f5e-998b-2ac4a0e6e255）の
 * form_get レスポンス構造に基づき完全書き直し（共通スキーマは _form-schemas.ts へ集約）。
 *
 * 重要な実物仕様（HubSpot公式ガイドだけでは判明しないもの）:
 *   - postSubmitAction.type = "redirect_url" (←旧スキーマで誤って "redirect" と書かれていた)
 *   - email field の validation: { blockedEmailDomains, useDefaultBlockList }
 *   - phone field の validation: { minAllowedDigits, maxAllowedDigits }
 *   - radio/checkbox/dropdown の options[]: { label, value, description, displayOrder }
 *   - configuration に notifyRecipients, recaptchaEnabled, embedType="V3" 等が必要
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getHubSpotToken } from "@/lib/hubspot/auth-context";
import { HubSpotError } from "@/lib/hubspot/errors";
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

export function registerFormCreate(server: McpServer) {
  server.tool(
    "form_create",
    `HubSpot にマーケティングフォームを新規作成する。セミナー申込・お問い合わせ・資料請求等のリードキャプチャフォームを作成可能。

返却: 作成されたフォームのID（UUID）, name, formType, fieldGroups, configuration。
フォームのフィールドはfieldGroupsで定義する。各フィールドにはobjectTypeId（0-1=コンタクト, 0-2=会社）とname（HubSpotプロパティ内部名）を指定。
フィールドのnameは既存のHubSpotプロパティ名と一致する必要がある（properties_listで確認）。

【validation について】
fieldType="email" → validation: { blockedEmailDomains: [], useDefaultBlockList: false }
fieldType="phone" → validation: { minAllowedDigits: 7, maxAllowedDigits: 20 }
（HubSpot APIの必須項目。省略すると 400 "Some required fields were not set: [validation]" となる）

【options について】
fieldType="radio" / "multiple_checkboxes" / "dropdown" → options: [{ label, value, description, displayOrder }] が必須。

【postSubmitAction.type について】
"thank_you"（お礼メッセージ表示）または "redirect_url"（URL転送）。"redirect" ではないので注意。`,
    {
      name: z
        .string()
        .describe("フォーム名（例: 'セミナー申込フォーム 2026年6月'）"),
      formType: z
        .enum(["hubspot", "captured", "flow", "blog_comment"])
        .optional()
        .describe(
          "フォームタイプ（デフォルト: hubspot）。hubspot=通常フォーム, flow=ポップアップ, captured=外部HTML, blog_comment=ブログコメント"
        ),
      fieldGroups: z
        .array(FieldGroupSchema)
        .describe(
          "フィールドグループの配列。各グループには1つ以上のフィールドを含む。1行に複数フィールドを並べるには同一グループ内に配置"
        ),
      configuration: ConfigurationSchema.optional().describe(
        "フォームの設定（言語、送信後アクション、ライフサイクルステージ、通知先等）"
      ),
      displayOptions: DisplayOptionsSchema.optional().describe(
        "フォームの表示オプション（テーマ・ボタンテキスト・CSSスタイル設定）"
      ),
      legalConsentOptions: LegalConsentOptionsSchema.optional().describe(
        "法的同意オプション（GDPR対応。type=none で同意不要）"
      ),
    },
    async ({
      name,
      formType,
      fieldGroups,
      configuration,
      displayOptions,
      legalConsentOptions,
    }) => {
      try {
        // HubSpot Forms v3 API は createdAt / updatedAt をリクエスト時に必須として要求する
        // （公式ガイド本文には記載が無いが、API リクエストスキーマでは必須扱い。
        // 公式 curl 例にも含まれている: https://developers.hubspot.com/docs/api-reference/marketing-forms-v3/forms/post-marketing-v3-forms-）
        // ユーザーが毎回指定する必要は無いため、サーバ側で現在時刻を自動補完する。
        const now = new Date().toISOString();
        const body: Record<string, unknown> = {
          name,
          formType: formType ?? "hubspot",
          fieldGroups,
          createdAt: now,
          updatedAt: now,
          archived: false,
        };
        // configuration も実物では必須扱いのため、未指定時は空オブジェクトを補完
        body.configuration = configuration ?? {};
        if (displayOptions) body.displayOptions = displayOptions;
        if (legalConsentOptions) body.legalConsentOptions = legalConsentOptions;

        const result = await fetchJson<Record<string, unknown>>(
          `${BASE_URL}/marketing/v3/forms`,
          {
            method: "POST",
            headers: getHeaders(),
            body: JSON.stringify(body),
          }
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
