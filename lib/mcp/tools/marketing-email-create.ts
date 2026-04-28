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

export function registerMarketingEmailCreate(server: McpServer) {
  server.tool(
    "marketing_email_create",
    `HubSpot マーケティングメールを新規作成する。ニュースレター、キャンペーンメール、セミナー告知メール等をDRAFT状態で作成。

返却: 作成されたメールのid, name, subject, state(DRAFT), content構造。
作成後はmarketing_email_updateで内容を編集し、marketing_email_publishで送信可能（Enterprise or transactional add-on必要）。

推奨ワークフロー: 既存メールをmarketing_email_getで取得→構造を参考にcreateまたはmarketing_email_cloneで複製。
メール本文はcontent.widgetsの中のbody.htmlにHTMLを設定。templatePathでDnDテンプレートを指定可能。`,
    {
      name: z.string().describe("メール名（内部管理用。例: 'セミナー告知 2026年4月'）"),
      subject: z.string().describe("メール件名（受信者に表示される。例: '【レヴォル】4月セミナーのご案内'）"),
      templatePath: z.string().optional().describe("メールテンプレートパス（例: '@hubspot/email/dnd/welcome.html'）。省略時はデフォルトテンプレート"),
      content: z.record(z.unknown()).optional().describe("メール本文のwidget構造（JSON）。既存メールをmarketing_email_getで取得し、そのcontent構造を参考にすることを推奨"),
      from: z.object({
        fromName: z.string().optional().describe("送信者名（例: 'レヴォル株式会社'）"),
        fromAddress: z.string().optional().describe("送信元メールアドレス"),
        replyTo: z.string().optional().describe("返信先メールアドレス（省略時はfromAddressと同じ）"),
        customReplyTo: z.string().optional().describe("カスタム返信先メールアドレス"),
      }).passthrough().optional().describe("送信者情報"),
      to: z.object({
        contactIdsInclude: z.array(z.number()).optional().describe("送信対象コンタクトIDの配列"),
        contactIdsExclude: z.array(z.number()).optional().describe("除外コンタクトIDの配列"),
        contactListIdsInclude: z.array(z.number()).optional().describe("送信対象リスト（ILS ID）の配列"),
        contactListIdsExclude: z.array(z.number()).optional().describe("除外リスト（ILS ID）の配列"),
      }).passthrough().optional().describe("送信対象設定（コンタクトID / リストID指定）"),
      additionalProperties: z.record(z.unknown()).optional().describe("追加プロパティ（JSON）。businessUnitId等"),
    },
    async ({ name, subject, templatePath, content, from, to, additionalProperties }) => {
      try {
        const body: Record<string, unknown> = { name, subject };
        if (templatePath) body.templatePath = templatePath;
        if (content) body.content = content;
        if (from) body.from = from;
        if (to) body.to = to;
        if (additionalProperties) Object.assign(body, additionalProperties);

        const result = await fetchJson<Record<string, unknown>>(
          `${BASE_URL}/marketing/v3/emails`,
          { method: "POST", headers: getHeaders(), body: JSON.stringify(body) }
        );
        return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
      } catch (error) {
        const message = error instanceof HubSpotError ? `HubSpot API エラー (${error.status}): ${error.message}` : String(error);
        return { content: [{ type: "text" as const, text: message }], isError: true };
      }
    }
  );
}
