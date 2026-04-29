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

export function registerSingleSendEmail(server: McpServer) {
  server.tool(
    "single_send_email",
    `HubSpot Single-Send API v4 でテンプレートメールを1通送信する。HubSpotのメールエディタで作成済みのメールテンプレートを使い、特定の宛先にパーソナライズして送信。

⚠️ Marketing Hub Enterprise が必須。
⚠️ スコープ: marketing-email

用途: セミナーリマインド、個別フォローアップ、注文確認、パスワードリセット等。
送信先のコンタクトが存在しない場合は自動作成され、マーケティングコンタクトに設定される。

返却: requestedAt, statusId（送信状態確認用）, status（PENDING/PROCESSING/COMPLETE）。
送信結果の確認はsingle_send_statusツールでstatusIdを指定。`,
    {
      emailId: z.number().describe("送信するメールテンプレートのコンテンツID（数値）。HubSpotメールエディタのURLから取得、またはmarketing_email_listで確認"),
      to: z.string().describe("送信先メールアドレス（例: 'customer@example.com'）"),
      from: z.string().optional().describe("送信元（'送信者名 <sender@example.com>' 形式）。省略時はテンプレートの設定を使用"),
      sendId: z.string().optional().describe("送信ID（重複防止用。同一sendIdのメールはアカウントあたり1回のみ送信される）"),
      replyTo: z.string().optional().describe("Reply-Toアドレス（単一の文字列。例: 'reply@example.com'）"),
      replyToList: z.array(z.string()).optional().describe("複数のReply-Toアドレス（配列。replyToと併用不可）"),
      cc: z.array(z.string()).optional().describe("CCアドレスの配列"),
      bcc: z.array(z.string()).optional().describe("BCCアドレスの配列"),
      contactProperties: z.record(z.string()).optional().describe("コンタクトプロパティ（{key: value}形式）。送信時にコンタクトレコードに設定される。テンプレート内で {{contact.KEY}} で参照可能。例: {firstname: '太郎', last_paid_date: '2026-03-01'}。v4 APIではフラットオブジェクト形式"),
      customProperties: z.record(z.unknown()).optional().describe("カスタムプロパティ（{key: value}形式）。テンプレート内で {{custom.KEY}} で参照可能。コンタクトレコードには保存されない。配列もサポート（Programmable Email Content使用時、HubL forループで展開可能）。v4 APIではフラットオブジェクト形式"),
    
      pretty: prettyParam,
},
    async ({ emailId, to, from, sendId, replyTo, replyToList, cc, bcc, contactProperties, customProperties, pretty }) => {
      try {
        const message: Record<string, unknown> = { to };
        if (from) message.from = from;
        if (sendId) message.sendId = sendId;
        if (replyTo) message.replyTo = replyTo;
        if (replyToList) message.replyToList = replyToList;
        if (cc) message.cc = cc;
        if (bcc) message.bcc = bcc;

        const body: Record<string, unknown> = { emailId, message };
        if (contactProperties) body.contactProperties = contactProperties;
        if (customProperties) body.customProperties = customProperties;

        const result = await fetchJson<Record<string, unknown>>(
          `${BASE_URL}/marketing/v4/email/single-send`,
          { method: "POST", headers: getHeaders(), body: JSON.stringify(body) }
        );
        return { content: [{ type: "text" as const, text: formatToolResult(result, pretty) }] };
      } catch (error) {
        const message = error instanceof HubSpotError ? `HubSpot API エラー (${error.status}): ${error.message}` : String(error);
        return { content: [{ type: "text" as const, text: message }], isError: true };
      }
    }
  );
}
