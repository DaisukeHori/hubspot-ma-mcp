/**
 * HubSpot Automation API v4 クライアント
 *
 * ワークフロー CRUD 操作を提供する。
 * - Bearer Token 認証（リクエストヘッダー or 環境変数）
 * - レート制限対応（自動リトライ）
 * - エクスポネンシャルバックオフ
 */

import { getHubSpotToken } from "./auth-context";
import { HubSpotError } from "./errors";
import type {
  HubSpotFlow,
  HubSpotFlowListResponse,
  HubSpotBatchReadResponse,
  CreateFlowInput,
  UpdateFlowInput,
} from "./types";

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;
const BASE_URL = "https://api.hubapi.com";

// ── 内部ヘルパー ──

function getHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${getHubSpotToken()}`,
    "Content-Type": "application/json",
  };
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let message = response.statusText;
    let correlationId: string | undefined;

    try {
      const errorBody = await response.json();
      message = errorBody.message || message;
      correlationId = errorBody.correlationId;
    } catch {
      // JSON パースに失敗した場合はデフォルトメッセージを使用
    }

    throw new HubSpotError(response.status, message, correlationId);
  }

  // 204 No Content (DELETE成功時)
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

async function fetchWithRetry<T>(
  url: string,
  options: RequestInit
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url, options);

      // 429 レート制限 → リトライ
      if (response.status === 429 && attempt < MAX_RETRIES) {
        const retryAfter = response.headers.get("Retry-After");
        const delayMs = retryAfter
          ? parseInt(retryAfter, 10) * 1000
          : BASE_DELAY_MS * Math.pow(2, attempt);

        await new Promise((resolve) => setTimeout(resolve, delayMs));
        continue;
      }

      return await handleResponse<T>(response);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // HubSpotError で 429 以外ならリトライしない
      if (error instanceof HubSpotError && error.status !== 429) {
        throw error;
      }

      // 5xx エラーはリトライ
      if (
        error instanceof HubSpotError &&
        error.status >= 500 &&
        attempt < MAX_RETRIES
      ) {
        const delayMs = BASE_DELAY_MS * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        continue;
      }

      if (attempt >= MAX_RETRIES) {
        throw lastError;
      }
    }
  }

  throw lastError || new Error("Unexpected retry loop exit");
}

// ── 公開 API ──

/**
 * ワークフロー一覧を取得する
 */
export async function listFlows(): Promise<HubSpotFlow[]> {
  const data = await fetchWithRetry<HubSpotFlowListResponse>(
    `${BASE_URL}/automation/v4/flows`,
    { method: "GET", headers: getHeaders() }
  );
  return data.results;
}

/**
 * 指定したワークフローの詳細を取得する
 */
export async function getFlow(flowId: string): Promise<HubSpotFlow> {
  return fetchWithRetry<HubSpotFlow>(
    `${BASE_URL}/automation/v4/flows/${flowId}`,
    { method: "GET", headers: getHeaders() }
  );
}

/**
 * 複数のワークフローをIDで一括取得する
 *
 * HubSpot Automation v4 API 仕様:
 *   POST /automation/v4/flows/batch/read
 *   body: { inputs: [{ flowId: string, type: "FLOW_ID" }, ...] }
 *
 * 参考: https://developers.hubspot.com/docs/api-reference/automation-automation-v4-v4/guide
 *
 * 注意: 当初 `{ id }` で送っていたが HubSpot API は `flowId` をキーとして要求し、
 * かつ各要素に `type: "FLOW_ID"` が必須のため 400 エラーで失敗していた（2026-04-28修正）。
 */
export async function batchReadFlows(
  flowIds: string[]
): Promise<HubSpotFlow[]> {
  const data = await fetchWithRetry<HubSpotBatchReadResponse>(
    `${BASE_URL}/automation/v4/flows/batch/read`,
    {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({
        inputs: flowIds.map((id) => ({ flowId: id, type: "FLOW_ID" })),
      }),
    }
  );
  return data.results;
}

/**
 * 新しいワークフローを作成する
 */
export async function createFlow(
  input: CreateFlowInput
): Promise<HubSpotFlow> {
  const body = {
    name: input.name,
    type: input.type,
    objectTypeId: input.objectTypeId,
    isEnabled: input.isEnabled ?? false,
    ...(input.actions && { actions: input.actions }),
    ...(input.enrollmentCriteria && {
      enrollmentCriteria: input.enrollmentCriteria,
    }),
  };

  return fetchWithRetry<HubSpotFlow>(
    `${BASE_URL}/automation/v4/flows`,
    {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(body),
    }
  );
}

/**
 * 既存ワークフローを更新する
 * revisionId は最新を自動取得してマージする
 */
export async function updateFlow(
  flowId: string,
  updates: UpdateFlowInput
): Promise<HubSpotFlow> {
  // ① 現在のワークフローを取得（最新の revisionId を得る）
  const current = await getFlow(flowId);

  // ② 読み取り専用フィールドを除去
  const {
    createdAt: _c,
    updatedAt: _u,
    ...currentClean
  } = current as Record<string, unknown>;

  // ③ 更新内容をマージ（revisionId は現在の値を維持）
  const merged = {
    ...currentClean,
    ...updates,
    revisionId: current.revisionId,
  };

  return fetchWithRetry<HubSpotFlow>(
    `${BASE_URL}/automation/v4/flows/${flowId}`,
    {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify(merged),
    }
  );
}

/**
 * ワークフローを削除する
 */
export async function deleteFlow(flowId: string): Promise<void> {
  await fetchWithRetry<void>(
    `${BASE_URL}/automation/v4/flows/${flowId}`,
    { method: "DELETE", headers: getHeaders() }
  );
}
