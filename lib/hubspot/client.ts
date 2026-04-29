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
 *
 * 必須フィールド (name, type, objectTypeId) 以外のすべてのフィールドを
 * リクエストボディに含めて HubSpot API に送る。これにより、workflow_get で
 * 取得した完全なWF定義から「読み取り専用フィールド」だけを除去して渡せば
 * 既存WFを完全コピーできる。
 *
 * 公式: POST /automation/v4/flows
 *
 * 隠れ仕様メモ:
 *  - actionId は WF 内部の識別子。複製時に source と同じ値を使っても
 *    新WFは別 flowId なので衝突しない。HubSpot 側で内部的に新採番される。
 *  - nextAvailableActionId は actions[] の最大値 + 1 にしておくのが安全。
 *    省略するとサーバ側で自動計算される。
 *  - description は短くしないと UI 上で切れることがある（実害なし）。
 */
export async function createFlow(
  input: CreateFlowInput
): Promise<HubSpotFlow> {
  // 必須フィールドを明示的にセット
  const body: Record<string, unknown> = {
    name: input.name,
    type: input.type,
    objectTypeId: input.objectTypeId,
    isEnabled: input.isEnabled ?? false,
  };

  // オプションフィールドを条件付きでマージ（undefined は API に送らない）
  // CreateFlowInput の [key: string]: unknown により将来追加フィールドも自動的に通る
  for (const [key, value] of Object.entries(input)) {
    if (
      key !== "name" &&
      key !== "type" &&
      key !== "objectTypeId" &&
      key !== "isEnabled" &&
      value !== undefined
    ) {
      body[key] = value;
    }
  }

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
 * 既存ワークフローを複製する（GET → strip → POST のヘルパー）
 *
 * ① getFlow(sourceFlowId) で完全な定義を取得
 * ② 読み取り専用フィールド（id, revisionId, createdAt, updatedAt, migrationStatus）を除去
 * ③ overrides をマージ（name は必須なので呼び出し側で必ず指定）
 * ④ createFlow で POST
 *
 * 用途:
 *  - LINE QR WFの月次バリエーション作成（テンプレートから新月版を量産）
 *  - 同じロジックの別WFを作る場合の雛形コピー
 *
 * 注意:
 *  - isEnabled は明示的に false にしてある（うっかり本番起動を防ぐ）。
 *    overrides で true を指定すれば有効化された状態で作成される。
 *  - 複製先WFはあくまで「別物」なので、source 側の動作には影響しない。
 *  - HubSpot UI 上で「複製」ボタンを押した場合と同等の挙動を API で再現する。
 */
export async function cloneFlow(
  sourceFlowId: string,
  newName: string,
  overrides?: Record<string, unknown>
): Promise<HubSpotFlow> {
  // ① ソース WF を完全取得
  const source = await getFlow(sourceFlowId);

  // ② 読み取り専用フィールドを除去
  //    HubSpot 側で自動採番される、または不変のフィールドを落とす
  const {
    id: _id,
    revisionId: _revisionId,
    createdAt: _createdAt,
    updatedAt: _updatedAt,
    migrationStatus: _migrationStatus,
    ...cleanFlow
  } = source as Record<string, unknown>;

  // ③ overrides を上書きマージ（newName は最優先）
  //    isEnabled はデフォルトで false（事故防止）。overrides で上書き可能。
  const newFlow: CreateFlowInput = {
    ...(cleanFlow as CreateFlowInput),
    ...(overrides || {}),
    name: newName,
    isEnabled: overrides?.isEnabled === true ? true : false,
    // 必須フィールドの型保証（cleanFlow に含まれているはずだが TS 的にも明示）
    type: cleanFlow.type as "CONTACT_FLOW" | "PLATFORM_FLOW",
    objectTypeId: cleanFlow.objectTypeId as string,
  };

  // ④ POST して新WFを作成
  return createFlow(newFlow);
}

/**
 * DYNAMIC リストのフィルタ条件を更新する
 *
 * 公式: PUT /crm/v3/lists/{listId}/update-list-filters
 * リクエストボディ: { filterBranch: {...} }
 * クエリオプション: ?enrollObjectsInWorkflows=true|false
 *   → 新たにリストに含まれることになったレコードを、リスト連動WFに自動エンロールするか
 *
 * 制約:
 *  - DYNAMIC リスト（processingType: "DYNAMIC"）専用
 *  - MANUAL / SNAPSHOT リストには使えない（HubSpot側でエラーが返る）
 *  - フィルタ更新後、メンバーシップは非同期で再評価される（即時反映ではない）
 *
 * filterBranch 構造の取得方法:
 *  - list_get(listId, includeFilters=true) で既存リストの filterBranch をそのまま参考にする
 *  - 新規構築する場合は HubSpot 公式ガイド参照:
 *    https://developers.hubspot.com/docs/api-reference/crm-lists-v3/list-filters
 */
export async function updateListFilters(
  listId: string,
  filterBranch: Record<string, unknown>,
  enrollObjectsInWorkflows?: boolean
): Promise<Record<string, unknown>> {
  const params = new URLSearchParams();
  if (enrollObjectsInWorkflows !== undefined) {
    params.set("enrollObjectsInWorkflows", String(enrollObjectsInWorkflows));
  }
  const qs = params.toString() ? `?${params.toString()}` : "";

  return fetchWithRetry<Record<string, unknown>>(
    `${BASE_URL}/crm/v3/lists/${listId}/update-list-filters${qs}`,
    {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify({ filterBranch }),
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
