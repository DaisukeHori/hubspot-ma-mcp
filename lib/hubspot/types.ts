/**
 * HubSpot Automation API v4 型定義
 */

// ── ワークフロー基本型 ──

export interface HubSpotFlow {
  id: string;
  name: string;
  type: "CONTACT_FLOW" | "PLATFORM_FLOW";
  objectTypeId: string;
  isEnabled: boolean;
  revisionId: string;
  createdAt: string;
  updatedAt: string;
  actions: HubSpotFlowAction[];
  enrollmentCriteria?: HubSpotEnrollmentCriteria;
  [key: string]: unknown;
}

export interface HubSpotFlowAction {
  actionTypeId: string;
  actionId: string;
  [key: string]: unknown;
}

export interface HubSpotEnrollmentCriteria {
  shouldReEnroll: boolean;
  listMembershipBased?: unknown;
  filterBased?: unknown;
  [key: string]: unknown;
}

// ── API レスポンス型 ──

export interface HubSpotFlowListResponse {
  flows: HubSpotFlow[];
}

export interface HubSpotBatchReadResponse {
  results: HubSpotFlow[];
}

// ── ワークフロー作成用 ──

export interface CreateFlowInput {
  name: string;
  type: "CONTACT_FLOW" | "PLATFORM_FLOW";
  objectTypeId: string;
  isEnabled?: boolean;
  actions?: Record<string, unknown>[];
  enrollmentCriteria?: Record<string, unknown>;
}

// ── ワークフロー更新用 ──

export interface UpdateFlowInput {
  [key: string]: unknown;
}

// ── API エラー ──

export interface HubSpotApiError {
  status: string;
  message: string;
  correlationId: string;
  category: string;
}

// ── オブジェクトタイプ対応表 ──

export const OBJECT_TYPE_LABELS: Record<string, string> = {
  "0-1": "コンタクト",
  "0-2": "会社",
  "0-3": "取引",
  "0-5": "チケット",
};
