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

function handleError(error: unknown) {
  const message = error instanceof HubSpotError ? `HubSpot API エラー (${error.status}): ${error.message}` : String(error);
  return { content: [{ type: "text" as const, text: message }], isError: true };
}

export function registerHubspotMarketingEvents(server: McpServer) {
  // --- marketing_event_list ---
  server.tool(
    "marketing_event_list",
    `HubSpot のマーケティングイベント（セミナー・ウェビナー等）を一覧取得する。
Marketing Events v3 API。イベント名・日時・開催者・URL・参加者数・キャンセル数等を返却。
スコープ: crm.objects.marketing_events.read`,
    {
      limit: z.number().optional().describe("取得件数（デフォルト10）"),
      after: z.string().optional().describe("ページネーションカーソル"),
    },
    async ({ limit, after }) => {
      try {
        const params = new URLSearchParams({ limit: String(limit || 10) });
        if (after) params.set("after", after);
        const data = await fetchJson<Record<string, unknown>>(
          `${BASE_URL}/marketing/v3/marketing-events?${params}`,
          { method: "GET", headers: getHeaders() }
        );
        return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
      } catch (error) { return handleError(error); }
    }
  );

  // --- marketing_event_get ---
  server.tool(
    "marketing_event_get",
    `HubSpot のマーケティングイベントを1件取得する（objectId指定）。
返却: eventName, eventType, eventOrganizer, eventDescription, eventUrl, startDateTime, endDateTime, eventCancelled, registrants, attendees, cancellations, noShows。`,
    {
      objectId: z.string().describe("マーケティングイベントのobjectId（Record ID）"),
    },
    async ({ objectId }) => {
      try {
        const data = await fetchJson<Record<string, unknown>>(
          `${BASE_URL}/marketing/v3/marketing-events/${objectId}`,
          { method: "GET", headers: getHeaders() }
        );
        return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
      } catch (error) { return handleError(error); }
    }
  );

  // --- marketing_event_create ---
  server.tool(
    "marketing_event_create",
    `HubSpot に新しいマーケティングイベントを作成する。
必須: eventName, externalEventId（外部システムでのイベントID）, externalAccountId（外部アカウントID）, eventOrganizer。
任意: eventType, eventDescription, eventUrl, startDateTime(ISO8601), endDateTime(ISO8601), customProperties。
スコープ: crm.objects.marketing_events.write`,
    {
      eventName: z.string().describe("イベント名"),
      externalEventId: z.string().describe("外部システムでのイベントID（一意識別子）"),
      externalAccountId: z.string().describe("外部アカウントID（アプリ識別子）"),
      eventOrganizer: z.string().describe("主催者名"),
      eventType: z.string().optional().describe("イベントタイプ（webinar, tradeshow等）"),
      eventDescription: z.string().optional().describe("イベント説明"),
      eventUrl: z.string().optional().describe("イベントURL"),
      startDateTime: z.string().optional().describe("開始日時（ISO8601）"),
      endDateTime: z.string().optional().describe("終了日時（ISO8601）"),
      eventCancelled: z.boolean().optional().describe("キャンセル済みか"),
      customProperties: z.array(z.object({
        name: z.string(),
        value: z.string(),
      })).optional().describe("カスタムプロパティ"),
    },
    async (params) => {
      try {
        const body: Record<string, unknown> = {
          eventName: params.eventName,
          externalEventId: params.externalEventId,
          externalAccountId: params.externalAccountId,
          eventOrganizer: params.eventOrganizer,
        };
        if (params.eventType) body.eventType = params.eventType;
        if (params.eventDescription) body.eventDescription = params.eventDescription;
        if (params.eventUrl) body.eventUrl = params.eventUrl;
        if (params.startDateTime) body.startDateTime = params.startDateTime;
        if (params.endDateTime) body.endDateTime = params.endDateTime;
        if (params.eventCancelled !== undefined) body.eventCancelled = params.eventCancelled;
        if (params.customProperties) body.customProperties = params.customProperties;
        const data = await fetchJson<Record<string, unknown>>(
          `${BASE_URL}/marketing/v3/marketing-events/events`,
          { method: "POST", headers: getHeaders(), body: JSON.stringify(body) }
        );
        return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
      } catch (error) { return handleError(error); }
    }
  );

  // --- marketing_event_update ---
  server.tool(
    "marketing_event_update",
    `HubSpot のマーケティングイベントを更新する（objectId指定、PATCH）。
指定したプロパティのみ更新。eventName, eventType, eventOrganizer, eventDescription, eventUrl, startDateTime, endDateTime, eventCancelled を変更可能。`,
    {
      objectId: z.string().describe("マーケティングイベントのobjectId"),
      eventName: z.string().optional().describe("イベント名"),
      eventType: z.string().optional().describe("イベントタイプ"),
      eventOrganizer: z.string().optional().describe("主催者名"),
      eventDescription: z.string().optional().describe("イベント説明"),
      eventUrl: z.string().optional().describe("イベントURL"),
      startDateTime: z.string().optional().describe("開始日時（ISO8601）"),
      endDateTime: z.string().optional().describe("終了日時（ISO8601）"),
      eventCancelled: z.boolean().optional().describe("キャンセル済みか"),
    },
    async ({ objectId, ...props }) => {
      try {
        const body: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(props)) {
          if (value !== undefined) body[key] = value;
        }
        const data = await fetchJson<Record<string, unknown>>(
          `${BASE_URL}/marketing/v3/marketing-events/${objectId}`,
          { method: "PATCH", headers: getHeaders(), body: JSON.stringify(body) }
        );
        return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
      } catch (error) { return handleError(error); }
    }
  );

  // --- marketing_event_delete ---
  server.tool(
    "marketing_event_delete",
    `HubSpot のマーケティングイベントを削除する（objectId指定）。
成功時は204 No Content。この操作は取り消し不可。`,
    {
      objectId: z.string().describe("マーケティングイベントのobjectId"),
      confirm: z.boolean().describe("削除を確認する（trueを指定）"),
    },
    async ({ objectId, confirm }) => {
      if (!confirm) {
        return { content: [{ type: "text" as const, text: "削除を実行するには confirm: true を指定してください。" }] };
      }
      try {
        const response = await fetch(
          `${BASE_URL}/marketing/v3/marketing-events/${objectId}`,
          { method: "DELETE", headers: getHeaders() }
        );
        if (!response.ok) {
          let message = response.statusText;
          try { const body = await response.json(); message = body.message || JSON.stringify(body); } catch { /* ignore */ }
          throw new HubSpotError(response.status, message);
        }
        return { content: [{ type: "text" as const, text: `マーケティングイベント ${objectId} を削除しました。` }] };
      } catch (error) { return handleError(error); }
    }
  );

  // --- marketing_event_attendance ---
  server.tool(
    "marketing_event_attendance",
    `マーケティングイベントの参加状態を記録する（objectId指定）。
コンタクトIDまたはメールアドレスで参加者を指定し、REGISTERED/ATTENDED/CANCELLEDの状態を記録。
joinedAt/leftAtで参加・退出時刻も記録可能。
スコープ: crm.objects.marketing_events.write`,
    {
      objectId: z.string().describe("マーケティングイベントのobjectId"),
      subscriberState: z.enum(["REGISTERED", "ATTENDED", "CANCELLED"]).describe("参加状態"),
      contactIds: z.array(z.number()).optional().describe("コンタクトIDの配列（vid）"),
      emails: z.array(z.string()).optional().describe("メールアドレスの配列（contactIdsの代わり）"),
      joinedAt: z.string().optional().describe("参加日時（ISO8601）— ATTENDED時"),
      leftAt: z.string().optional().describe("退出日時（ISO8601）— ATTENDED時"),
      interactionDateTime: z.number().optional().describe("インタラクション日時（UNIXミリ秒）"),
    },
    async ({ objectId, subscriberState, contactIds, emails, joinedAt, leftAt, interactionDateTime }) => {
      try {
        // コンタクトIDを使うパスかメールを使うパスか
        const useEmail = !contactIds && emails && emails.length > 0;
        const pathSuffix = useEmail ? "email-create" : "create";
        const url = `${BASE_URL}/marketing/v3/marketing-events/${objectId}/attendance/${subscriberState}/${pathSuffix}`;

        const inputs = useEmail
          ? emails!.map(email => {
              const input: Record<string, unknown> = { email };
              if (joinedAt || leftAt) {
                const props: Record<string, string> = {};
                if (joinedAt) props.joinedAt = joinedAt;
                if (leftAt) props.leftAt = leftAt;
                input.properties = props;
              }
              if (interactionDateTime) input.interactionDateTime = interactionDateTime;
              return input;
            })
          : (contactIds || []).map(vid => {
              const input: Record<string, unknown> = { vid };
              if (joinedAt || leftAt) {
                const props: Record<string, string> = {};
                if (joinedAt) props.joinedAt = joinedAt;
                if (leftAt) props.leftAt = leftAt;
                input.properties = props;
              }
              if (interactionDateTime) input.interactionDateTime = interactionDateTime;
              return input;
            });

        const data = await fetchJson<Record<string, unknown>>(url, {
          method: "POST",
          headers: getHeaders(),
          body: JSON.stringify({ inputs }),
        });
        return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
      } catch (error) { return handleError(error); }
    }
  );
}
