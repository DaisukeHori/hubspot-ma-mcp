/**
 * HubSpot CRM API v3 クライアント
 *
 * コンタクト・会社・取引・チケット・パイプライン・プロパティの
 * CRUD/検索操作を提供する。
 */

import { getHubSpotToken } from "./auth-context";
import { HubSpotError } from "./errors";

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
      // ignore
    }
    throw new HubSpotError(response.status, message, correlationId);
  }
  if (response.status === 204) return undefined as T;
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
      if (error instanceof HubSpotError && error.status !== 429 && error.status < 500) throw error;
      if (attempt >= MAX_RETRIES) throw lastError;
      const delayMs = BASE_DELAY_MS * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw lastError || new Error("Unexpected retry loop exit");
}

// ── CRM オブジェクト型定義 ──

export interface CrmObject {
  id: string;
  properties: Record<string, string | null>;
  createdAt: string;
  updatedAt: string;
  archived: boolean;
  associations?: Record<string, { results: Array<{ id: string; type: string }> }>;
}

export interface CrmSearchResponse {
  total: number;
  results: CrmObject[];
  paging?: { next?: { after: string } };
}

export interface CrmListResponse {
  results: CrmObject[];
  paging?: { next?: { after: string; link: string } };
}

export interface Pipeline {
  id: string;
  label: string;
  displayOrder: number;
  stages: PipelineStage[];
  createdAt: string;
  updatedAt: string;
  archived: boolean;
}

export interface PipelineStage {
  id: string;
  label: string;
  displayOrder: number;
  metadata: Record<string, string>;
  createdAt: string;
  updatedAt: string;
  archived: boolean;
}

export interface CrmProperty {
  name: string;
  label: string;
  type: string;
  fieldType: string;
  description: string;
  groupName: string;
  options: Array<{ label: string; value: string; displayOrder: number }>;
  createdAt: string;
  updatedAt: string;
  archived: boolean;
}

// ── CRM 汎用操作 ──

type ObjectType = "contacts" | "companies" | "deals" | "tickets";

/**
 * CRM オブジェクトを検索する
 */
export async function crmSearch(
  objectType: ObjectType,
  query: string,
  properties?: string[],
  filterGroups?: Array<{
    filters: Array<{
      propertyName: string;
      operator: string;
      value?: string;
    }>;
  }>,
  limit: number = 10,
  after?: string
): Promise<CrmSearchResponse> {
  const body: Record<string, unknown> = { limit };
  if (query) body.query = query;
  if (properties?.length) body.properties = properties;
  if (filterGroups?.length) body.filterGroups = filterGroups;
  if (after) body.after = after;

  return fetchWithRetry<CrmSearchResponse>(
    `${BASE_URL}/crm/v3/objects/${objectType}/search`,
    { method: "POST", headers: getHeaders(), body: JSON.stringify(body) }
  );
}

/**
 * CRM オブジェクトを ID で取得する
 */
export async function crmGet(
  objectType: ObjectType,
  objectId: string,
  properties?: string[],
  associations?: string[]
): Promise<CrmObject> {
  const params = new URLSearchParams();
  if (properties?.length) params.set("properties", properties.join(","));
  if (associations?.length) params.set("associations", associations.join(","));
  const qs = params.toString() ? `?${params.toString()}` : "";

  return fetchWithRetry<CrmObject>(
    `${BASE_URL}/crm/v3/objects/${objectType}/${objectId}${qs}`,
    { method: "GET", headers: getHeaders() }
  );
}

/**
 * CRM オブジェクトを作成する
 */
export async function crmCreate(
  objectType: ObjectType,
  properties: Record<string, string>,
  associations?: Array<{
    to: { id: string };
    types: Array<{
      associationCategory: string;
      associationTypeId: number;
    }>;
  }>
): Promise<CrmObject> {
  const body: Record<string, unknown> = { properties };
  if (associations?.length) body.associations = associations;

  return fetchWithRetry<CrmObject>(
    `${BASE_URL}/crm/v3/objects/${objectType}`,
    { method: "POST", headers: getHeaders(), body: JSON.stringify(body) }
  );
}

/**
 * CRM オブジェクトを更新する
 */
export async function crmUpdate(
  objectType: ObjectType,
  objectId: string,
  properties: Record<string, string>
): Promise<CrmObject> {
  return fetchWithRetry<CrmObject>(
    `${BASE_URL}/crm/v3/objects/${objectType}/${objectId}`,
    {
      method: "PATCH",
      headers: getHeaders(),
      body: JSON.stringify({ properties }),
    }
  );
}

// ── パイプライン ──

/**
 * パイプライン一覧を取得する
 */
export async function listPipelines(
  objectType: "deals" | "tickets"
): Promise<Pipeline[]> {
  const data = await fetchWithRetry<{ results: Pipeline[] }>(
    `${BASE_URL}/crm/v3/pipelines/${objectType}`,
    { method: "GET", headers: getHeaders() }
  );
  return data.results;
}

// ── プロパティ ──

/**
 * オブジェクトのプロパティ一覧を取得する
 */
export async function listProperties(
  objectType: ObjectType
): Promise<CrmProperty[]> {
  const data = await fetchWithRetry<{ results: CrmProperty[] }>(
    `${BASE_URL}/crm/v3/properties/${objectType}`,
    { method: "GET", headers: getHeaders() }
  );
  return data.results;
}
