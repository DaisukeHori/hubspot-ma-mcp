/**
 * HubSpot CRM API v3 クライアント
 *
 * コンタクト・会社・取引・チケット・Line Item・Product・
 * パイプライン・プロパティの CRUD/検索操作を提供する。
 * CMS API（ブログ・ランディングページ・サイトページ）も含む。
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
  hasUniqueValue?: boolean;
}

// ── CRM 汎用操作 ──

export type ObjectType = "contacts" | "companies" | "deals" | "tickets" | "line_items" | "products" | "notes" | "tasks" | "emails" | "meetings" | "calls" | "quotes";

export async function crmSearch(
  objectType: ObjectType,
  query: string,
  properties?: string[],
  filterGroups?: Array<{
    filters: Array<{
      propertyName: string;
      operator: string;
      value?: string;
      values?: string[];
      highValue?: string;
    }>;
  }>,
  limit: number = 10,
  after?: string,
  sorts?: Array<{ propertyName: string; direction: string }>
): Promise<CrmSearchResponse> {
  const body: Record<string, unknown> = { limit };
  if (query) body.query = query;
  if (properties?.length) body.properties = properties;
  if (filterGroups?.length) body.filterGroups = filterGroups;
  if (after) body.after = after;
  if (sorts?.length) body.sorts = sorts;

  return fetchWithRetry<CrmSearchResponse>(
    `${BASE_URL}/crm/v3/objects/${objectType}/search`,
    { method: "POST", headers: getHeaders(), body: JSON.stringify(body) }
  );
}

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

export async function crmDelete(
  objectType: ObjectType,
  objectId: string
): Promise<void> {
  return fetchWithRetry<void>(
    `${BASE_URL}/crm/v3/objects/${objectType}/${objectId}`,
    { method: "DELETE", headers: getHeaders() }
  );
}

// ── パイプライン ──

export async function listPipelines(
  objectType: "deals" | "tickets"
): Promise<Pipeline[]> {
  const data = await fetchWithRetry<{ results: Pipeline[] }>(
    `${BASE_URL}/crm/v3/pipelines/${objectType}`,
    { method: "GET", headers: getHeaders() }
  );
  return data.results;
}

export async function createPipeline(
  objectType: "deals" | "tickets",
  label: string,
  displayOrder: number,
  stages: Array<{ label: string; displayOrder: number; metadata: Record<string, string> }>
): Promise<Pipeline> {
  return fetchWithRetry<Pipeline>(
    `${BASE_URL}/crm/v3/pipelines/${objectType}`,
    {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ label, displayOrder, stages }),
    }
  );
}

export async function updatePipeline(
  objectType: "deals" | "tickets",
  pipelineId: string,
  updates: { label?: string; displayOrder?: number; stages?: Array<{ id?: string; label: string; displayOrder: number; metadata: Record<string, string> }> }
): Promise<Pipeline> {
  return fetchWithRetry<Pipeline>(
    `${BASE_URL}/crm/v3/pipelines/${objectType}/${pipelineId}`,
    {
      method: "PATCH",
      headers: getHeaders(),
      body: JSON.stringify(updates),
    }
  );
}

export async function deletePipeline(
  objectType: "deals" | "tickets",
  pipelineId: string
): Promise<void> {
  return fetchWithRetry<void>(
    `${BASE_URL}/crm/v3/pipelines/${objectType}/${pipelineId}`,
    { method: "DELETE", headers: getHeaders() }
  );
}

// ── プロパティ ──

export async function listProperties(
  objectType: string
): Promise<CrmProperty[]> {
  const data = await fetchWithRetry<{ results: CrmProperty[] }>(
    `${BASE_URL}/crm/v3/properties/${objectType}`,
    { method: "GET", headers: getHeaders() }
  );
  return data.results;
}

export async function createProperty(
  objectType: string,
  property: {
    name: string;
    label: string;
    type: string;
    fieldType: string;
    groupName: string;
    description?: string;
    hasUniqueValue?: boolean;
    hidden?: boolean;
    formField?: boolean;
    displayOrder?: number;
    dataSensitivity?: string;
    numberDisplayHint?: string;
    showCurrencySymbol?: boolean;
    currencyPropertyName?: string;
    calculationFormula?: string;
    referencedObjectType?: string;
    externalOptions?: boolean;
    options?: Array<{
      label: string;
      value: string;
      hidden: boolean;
      displayOrder?: number;
      description?: string;
    }>;
  }
): Promise<CrmProperty> {
  return fetchWithRetry<CrmProperty>(
    `${BASE_URL}/crm/v3/properties/${objectType}`,
    {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(property),
    }
  );
}

export async function updateProperty(
  objectType: string,
  propertyName: string,
  updates: {
    label?: string;
    description?: string;
    groupName?: string;
    options?: Array<{ label: string; value: string; displayOrder: number }>;
  }
): Promise<CrmProperty> {
  return fetchWithRetry<CrmProperty>(
    `${BASE_URL}/crm/v3/properties/${objectType}/${propertyName}`,
    {
      method: "PATCH",
      headers: getHeaders(),
      body: JSON.stringify(updates),
    }
  );
}

export async function deleteProperty(
  objectType: string,
  propertyName: string
): Promise<void> {
  return fetchWithRetry<void>(
    `${BASE_URL}/crm/v3/properties/${objectType}/${propertyName}`,
    { method: "DELETE", headers: getHeaders() }
  );
}

// ── CMS API ──

export interface CmsPage {
  id: string;
  name: string;
  slug: string;
  state: string;
  publishDate?: string;
  createdAt: string;
  updatedAt: string;
  [key: string]: unknown;
}

export interface CmsBlogPost {
  id: string;
  name: string;
  slug: string;
  state: string;
  publishDate?: string;
  htmlTitle?: string;
  postBody?: string;
  metaDescription?: string;
  tagIds?: number[];
  createdAt: string;
  updatedAt: string;
  [key: string]: unknown;
}

export async function listCmsPages(
  pageType: "landing-pages" | "site-pages",
  limit: number = 20,
  after?: string
): Promise<{ total: number; results: CmsPage[]; paging?: { next?: { after: string } } }> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (after) params.set("after", after);

  return fetchWithRetry(
    `${BASE_URL}/cms/v3/pages/${pageType}?${params.toString()}`,
    { method: "GET", headers: getHeaders() }
  );
}

export async function listBlogPosts(
  limit: number = 20,
  after?: string
): Promise<{ total: number; results: CmsBlogPost[]; paging?: { next?: { after: string } } }> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (after) params.set("after", after);

  return fetchWithRetry(
    `${BASE_URL}/cms/v3/blogs/posts?${params.toString()}`,
    { method: "GET", headers: getHeaders() }
  );
}

export async function updateBlogPost(
  postId: string,
  updates: Record<string, unknown>
): Promise<CmsBlogPost> {
  return fetchWithRetry<CmsBlogPost>(
    `${BASE_URL}/cms/v3/blogs/posts/${postId}`,
    {
      method: "PATCH",
      headers: getHeaders(),
      body: JSON.stringify(updates),
    }
  );
}

export async function updateCmsPage(
  pageType: "landing-pages" | "site-pages",
  pageId: string,
  updates: Record<string, unknown>
): Promise<CmsPage> {
  return fetchWithRetry<CmsPage>(
    `${BASE_URL}/cms/v3/pages/${pageType}/${pageId}`,
    {
      method: "PATCH",
      headers: getHeaders(),
      body: JSON.stringify(updates),
    }
  );
}

/**
 * CMSページを取得する（公開ページ）。
 * widgets / widgetContainers / layoutSections も含む完全な Page オブジェクトが返る。
 *
 * 公式仕様:
 *   GET /cms/v3/pages/{landing-pages|site-pages}/{objectId}
 */
export async function getCmsPage(
  pageType: "landing-pages" | "site-pages",
  pageId: string
): Promise<CmsPage> {
  return fetchWithRetry<CmsPage>(
    `${BASE_URL}/cms/v3/pages/${pageType}/${pageId}`,
    { method: "GET", headers: getHeaders() }
  );
}

/**
 * CMSページの draft を取得する。
 *
 * draft が存在しない場合は published 版がそのまま draft として返る挙動。
 *
 * 公式仕様:
 *   GET /cms/v3/pages/{landing-pages|site-pages}/{objectId}/draft
 */
export async function getCmsPageDraft(
  pageType: "landing-pages" | "site-pages",
  pageId: string
): Promise<CmsPage> {
  return fetchWithRetry<CmsPage>(
    `${BASE_URL}/cms/v3/pages/${pageType}/${pageId}/draft`,
    { method: "GET", headers: getHeaders() }
  );
}

/**
 * CMSページの draft を更新する。
 *
 * 公式ドキュメント抜粋:
 *   "The properties provided in the supplied payload will override the existing
 *    draft properties without any complex merging logic. Consequently, when
 *    updating nested properties such as those within the widgets, widgetContainers,
 *    or layoutSections of the page, you must include the full definition of the object."
 *
 * → 子要素（widgets/widgetContainers/layoutSections）を一部書き換える時は、
 *   必ずページ全体を取得して、変更したい箇所のみ書き換え、構造全体を送信する必要がある。
 *
 * 公式仕様:
 *   PATCH /cms/v3/pages/{landing-pages|site-pages}/{objectId}/draft
 */
export async function updateCmsPageDraft(
  pageType: "landing-pages" | "site-pages",
  pageId: string,
  updates: Record<string, unknown>
): Promise<CmsPage> {
  return fetchWithRetry<CmsPage>(
    `${BASE_URL}/cms/v3/pages/${pageType}/${pageId}/draft`,
    {
      method: "PATCH",
      headers: getHeaders(),
      body: JSON.stringify(updates),
    }
  );
}

/**
 * CMSページの draft を本番（published）に反映する。
 *
 * 公式ドキュメント:
 *   "Take any changes from the draft version of the Landing Page and apply them
 *    to the live version."
 *
 * 公式仕様:
 *   POST /cms/v3/pages/{landing-pages|site-pages}/{objectId}/draft/push-live
 *   requestBody: なし（空オブジェクトを送る）
 */
export async function pushCmsPageDraftLive(
  pageType: "landing-pages" | "site-pages",
  pageId: string
): Promise<unknown> {
  return fetchWithRetry<unknown>(
    `${BASE_URL}/cms/v3/pages/${pageType}/${pageId}/draft/push-live`,
    {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({}),
    }
  );
}


// ── Associations API（v4）──

export interface AssociationResult {
  results: Array<{
    toObjectId: number;
    associationTypes: Array<{
      category: string;
      typeId: number;
      label: string | null;
    }>;
  }>;
  paging?: { next?: { after: string } };
}

export interface AssociationLabel {
  category: string;
  typeId: number;
  label: string | null;
}

export async function listAssociations(
  fromObjectType: string,
  fromObjectId: string,
  toObjectType: string,
  limit: number = 100,
  after?: string
): Promise<AssociationResult> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (after) params.set("after", after);

  return fetchWithRetry<AssociationResult>(
    `${BASE_URL}/crm/v4/objects/${fromObjectType}/${fromObjectId}/associations/${toObjectType}?${params.toString()}`,
    { method: "GET", headers: getHeaders() }
  );
}

export async function createAssociation(
  fromObjectType: string,
  fromObjectId: string,
  toObjectType: string,
  toObjectId: string,
  associationCategory?: string,
  associationTypeId?: number
): Promise<unknown> {
  if (associationCategory && associationTypeId !== undefined) {
    // v4 batch/create with label (supports direction + category)
    return fetchWithRetry<unknown>(
      `${BASE_URL}/crm/v4/associations/${fromObjectType}/${toObjectType}/batch/create`,
      {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          inputs: [
            {
              from: { id: fromObjectId },
              to: { id: toObjectId },
              types: [
                {
                  associationCategory,
                  associationTypeId,
                },
              ],
            },
          ],
        }),
      }
    );
  } else {
    // v4 default (unlabeled) association
    return fetchWithRetry<unknown>(
      `${BASE_URL}/crm/v4/objects/${fromObjectType}/${fromObjectId}/associations/default/${toObjectType}/${toObjectId}`,
      { method: "PUT", headers: getHeaders() }
    );
  }
}

export async function deleteAssociation(
  fromObjectType: string,
  fromObjectId: string,
  toObjectType: string,
  toObjectId: string
): Promise<void> {
  return fetchWithRetry<void>(
    `${BASE_URL}/crm/v4/objects/${fromObjectType}/${fromObjectId}/associations/${toObjectType}/${toObjectId}`,
    { method: "DELETE", headers: getHeaders() }
  );
}

export async function listAssociationLabels(
  fromObjectType: string,
  toObjectType: string
): Promise<{ results: AssociationLabel[] }> {
  return fetchWithRetry<{ results: AssociationLabel[] }>(
    `${BASE_URL}/crm/v4/associations/${fromObjectType}/${toObjectType}/labels`,
    { method: "GET", headers: getHeaders() }
  );
}

export async function createAssociationLabel(
  fromObjectType: string,
  toObjectType: string,
  label: string,
  name: string,
  inverseLabel?: string
): Promise<{ results: AssociationLabel[] }> {
  const body: Record<string, string> = { label, name };
  if (inverseLabel) body.inverseLabel = inverseLabel;
  return fetchWithRetry<{ results: AssociationLabel[] }>(
    `${BASE_URL}/crm/v4/associations/${fromObjectType}/${toObjectType}/labels`,
    {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(body),
    }
  );
}

export async function updateAssociationLabel(
  fromObjectType: string,
  toObjectType: string,
  associationTypeId: number,
  label: string,
  inverseLabel?: string
): Promise<unknown> {
  const body: Record<string, unknown> = { label, associationTypeId };
  if (inverseLabel) body.inverseLabel = inverseLabel;
  return fetchWithRetry<unknown>(
    `${BASE_URL}/crm/v4/associations/${fromObjectType}/${toObjectType}/labels`,
    {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify(body),
    }
  );
}

export async function deleteAssociationLabel(
  fromObjectType: string,
  toObjectType: string,
  associationTypeId: number
): Promise<void> {
  return fetchWithRetry<void>(
    `${BASE_URL}/crm/v4/associations/${fromObjectType}/${toObjectType}/labels/${associationTypeId}`,
    { method: "DELETE", headers: getHeaders() }
  );
}

export async function removeAssociationLabels(
  fromObjectType: string,
  toObjectType: string,
  fromId: string,
  toId: string,
  types: Array<{ associationCategory: string; associationTypeId: number }>
): Promise<unknown> {
  return fetchWithRetry<unknown>(
    `${BASE_URL}/crm/v4/associations/${fromObjectType}/${toObjectType}/batch/labels/archive`,
    {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({
        inputs: [
          {
            from: { id: fromId },
            to: { id: toId },
            types,
          },
        ],
      }),
    }
  );
}


// ── Owners API ──

export interface Owner {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  userId: number;
  createdAt: string;
  updatedAt: string;
  archived: boolean;
  teams?: Array<{ id: string; name: string; primary: boolean }>;
}

export async function listOwners(
  limit: number = 100,
  after?: string,
  email?: string
): Promise<{ results: Owner[]; paging?: { next?: { after: string } } }> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (after) params.set("after", after);
  if (email) params.set("email", email);

  return fetchWithRetry(
    `${BASE_URL}/crm/v3/owners?${params.toString()}`,
    { method: "GET", headers: getHeaders() }
  );
}

export async function getOwner(ownerId: string): Promise<Owner> {
  return fetchWithRetry<Owner>(
    `${BASE_URL}/crm/v3/owners/${ownerId}`,
    { method: "GET", headers: getHeaders() }
  );
}

