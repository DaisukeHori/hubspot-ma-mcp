import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getHubSpotToken } from "@/lib/hubspot/auth-context";
import { HubSpotError } from "@/lib/hubspot/errors";

const BASE_URL = "https://api.hubapi.com";

function getHeaders(): Record<string, string> {
  return { Authorization: `Bearer ${getHubSpotToken()}`, "Content-Type": "application/json" };
}

export function registerCustomEventSend(server: McpServer) {
  server.tool(
    "custom_event_send",
    `HubSpot にカスタムイベントの発生データ（オカレンス）を送信する。「セミナー参加」「資料ダウンロード」「アプリログイン」等のビジネス固有イベントを記録。

事前にcustom_event_defineでイベント定義を作成しておく必要がある。
送信されたイベントはコンタクトのタイムラインに表示され、ワークフローのトリガーやセグメント条件に使用可能。

スコープ: analytics.behavioral_events.send
制限: 1,250リクエスト/秒、月間3,000万オカレンス。`,
    {
      eventName: z.string().describe("イベントの完全修飾名（例: 'pe12345_seminar_attendance'）。custom_event_defineの返却値のfullyQualifiedNameから取得"),
      objectId: z.string().optional().describe("関連するCRMレコードID（コンタクトID等の数値文字列）。emailとobjectIdのいずれかが必須"),
      email: z.string().optional().describe("関連するコンタクトのメールアドレス。objectIdとemailのいずれかが必須"),
      occurredAt: z.string().optional().describe("イベント発生日時（ISO8601形式）。省略時は現在時刻"),
      properties: z.record(z.string()).optional().describe("イベントプロパティ（キー:値）。custom_event_defineで定義したカスタムプロパティや、デフォルトプロパティ（hs_city, hs_country, hs_device_type, hs_page_id, hs_touchpoint_source等）"),
      utk: z.string().optional().describe("HubSpotトラッキングCookie値（Webイベントの場合）"),
      uuid: z.string().optional().describe("冪等性キー（UUID形式）。同一uuidのイベントは重複送信されない。リトライ時の重複防止に使用"),
    },
    async ({ eventName, objectId, email, occurredAt, properties, utk, uuid }) => {
      try {
        const body: Record<string, unknown> = { eventName };
        if (objectId) body.objectId = objectId;
        if (email) body.email = email;
        if (occurredAt) body.occurredAt = occurredAt;
        if (properties) body.properties = properties;
        if (utk) body.utk = utk;
        if (uuid) body.uuid = uuid;

        const response = await fetch(`${BASE_URL}/events/v3/send`, {
          method: "POST", headers: getHeaders(), body: JSON.stringify(body),
        });
        if (!response.ok) {
          let message = response.statusText;
          try { const rb = await response.json(); message = rb.message || JSON.stringify(rb); } catch { /* ignore */ }
          throw new HubSpotError(response.status, message);
        }
        return { content: [{ type: "text" as const, text: `イベント ${eventName} を送信しました。` }] };
      } catch (error) {
        const message = error instanceof HubSpotError ? `HubSpot API エラー (${error.status}): ${error.message}` : String(error);
        return { content: [{ type: "text" as const, text: message }], isError: true };
      }
    }
  );
}
