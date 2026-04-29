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
  results: HubSpotFlow[];
  paging?: {
    next?: {
      after: string;
      link: string;
    };
  };
}

export interface HubSpotBatchReadResponse {
  results: HubSpotFlow[];
}

// ── ワークフロー作成用 ──

/**
 * ワークフロー作成時のリクエストボディ。
 * HubSpot Automation v4 の POST /automation/v4/flows に送るフィールドを網羅する。
 *
 * 既存ワークフローを複製する場合は workflow_get の返却値から
 * 読み取り専用フィールド（id, revisionId, createdAt, updatedAt, migrationStatus）を
 * 除去したものをそのまま渡せばよい（cloneFlow ヘルパーが自動でやる）。
 *
 * 必須フィールド: name, type, objectTypeId
 * その他は HubSpot 側でデフォルト値が補完される。
 */
export interface CreateFlowInput {
  // ── 必須 ──
  name: string;
  type: "CONTACT_FLOW" | "PLATFORM_FLOW";
  objectTypeId: string;

  // ── 基本オプション ──
  isEnabled?: boolean;
  description?: string;

  // ── アクション・トリガー ──
  actions?: Record<string, unknown>[];
  enrollmentCriteria?: Record<string, unknown>;
  startActionId?: string;
  nextAvailableActionId?: string;

  // ── 高度な設定（既存WF複製時に重要）──
  customProperties?: Record<string, unknown>;
  connections?: Record<string, unknown>;
  associations?: Record<string, unknown>;
  segmentCriteria?: Record<string, unknown>;
  goalCriteria?: Record<string, unknown>;
  reEnrollmentTriggersEnabled?: boolean;
  scheduling?: Record<string, unknown>;
  timeWindows?: unknown[];
  blockedDates?: unknown[];
  suppressionListIds?: string[];

  // ── エスケープハッチ：HubSpot API の将来追加フィールドを任意に通す ──
  [key: string]: unknown;
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
