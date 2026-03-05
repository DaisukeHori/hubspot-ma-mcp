"use client";

import { useState, useEffect } from "react";

const MCP_URL = "https://hubspot-ma-mcp.vercel.app/api/mcp";
const TOKEN_PLACEHOLDER = "pat-na1-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx";

function Sprocket({ size = 32, color = "#FF7A59" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="32" height="32" rx="7" fill={color} />
      <g transform="translate(4,4)" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" fill="none">
        <circle cx="12" cy="12" r="4" />
        <circle cx="12" cy="12" r="1.5" fill="#fff" />
        <line x1="12" y1="2" x2="12" y2="5" />
        <line x1="12" y1="19" x2="12" y2="22" />
        <line x1="2" y1="12" x2="5" y2="12" />
        <line x1="19" y1="12" x2="22" y2="12" />
        <line x1="4.9" y1="4.9" x2="7" y2="7" />
        <line x1="17" y1="17" x2="19.1" y2="19.1" />
        <line x1="19.1" y1="4.9" x2="17" y2="7" />
        <line x1="7" y1="17" x2="4.9" y2="19.1" />
        <circle cx="3" cy="3" r="1.8" fill="#fff" stroke="none" />
        <circle cx="21" cy="21" r="1.8" fill="#fff" stroke="none" />
        <circle cx="21" cy="3" r="1.8" fill="#fff" stroke="none" />
      </g>
    </svg>
  );
}

type ClientId = "claude-web" | "claude-desktop" | "claude-code" | "cursor" | "vscode" | "windsurf" | "api";
interface ClientConfig { id: ClientId; name: string; icon: string; description: string; copyContent: string; copyLabel: string; instructions: string[]; note?: string; }

const CLIENTS: ClientConfig[] = [
  { id: "claude-web", name: "Claude.ai", icon: "◈", description: "Web版（Pro/Max/Team/Enterprise）", copyContent: `${MCP_URL}?token=${TOKEN_PLACEHOLDER}`, copyLabel: "URLをコピー", instructions: ['設定→コネクタ→「カスタムコネクタを追加」', "下のURLを貼り付けて「追加」（トークン部分を自分のものに置換）"], note: "URLにトークンが含まれます。共有PCでの利用にはご注意ください。" },
  { id: "claude-desktop", name: "Claude Desktop", icon: "◇", description: "デスクトップアプリ（macOS/Windows）", copyContent: JSON.stringify({ mcpServers: { "hubspot-ma": { command: "npx", args: ["mcp-remote", MCP_URL, "--header", `Authorization:Bearer ${TOKEN_PLACEHOLDER}`] } } }, null, 2), copyLabel: "JSONをコピー", instructions: ["macOS: ~/Library/Application Support/Claude/claude_desktop_config.json", "Windows: %APPDATA%\\Claude\\claude_desktop_config.json", "pat-na1-xxxx…を自分のトークンに置換→再起動"] },
  { id: "claude-code", name: "Claude Code", icon: "⌘", description: "ターミナルCLI", copyContent: `claude mcp add --transport http hubspot-ma ${MCP_URL} --header "Authorization:Bearer ${TOKEN_PLACEHOLDER}"`, copyLabel: "コマンドをコピー", instructions: ["pat-na1-xxxx…を自分のトークンに置換して実行"] },
  { id: "cursor", name: "Cursor", icon: "⟐", description: "AIコードエディタ", copyContent: JSON.stringify({ mcpServers: { "hubspot-ma": { type: "http", url: MCP_URL, headers: { Authorization: `Bearer ${TOKEN_PLACEHOLDER}` } } } }, null, 2), copyLabel: "JSONをコピー", instructions: ["Settings→Tools & Integrations→New MCP Server", "または ~/.cursor/mcp.json に貼り付け"] },
  { id: "vscode", name: "VS Code", icon: "⬡", description: "Visual Studio Code（Copilot Chat）", copyContent: JSON.stringify({ mcpServers: { "hubspot-ma": { type: "http", url: MCP_URL, headers: { Authorization: `Bearer ${TOKEN_PLACEHOLDER}` } } } }, null, 2), copyLabel: "JSONをコピー", instructions: [".vscode/mcp.json またはユーザー設定に貼り付け"] },
  { id: "windsurf", name: "Windsurf", icon: "◆", description: "AIコードエディタ", copyContent: JSON.stringify({ mcpServers: { "hubspot-ma": { command: "npx", args: ["mcp-remote", MCP_URL, "--header", `Authorization:Bearer ${TOKEN_PLACEHOLDER}`] } } }, null, 2), copyLabel: "JSONをコピー", instructions: ["Cascade→MCP servers→Add Server"] },
  { id: "api", name: "Anthropic API", icon: "⬢", description: "MCP Connector Beta", copyContent: JSON.stringify({ mcp_servers: [{ type: "url", url: MCP_URL, name: "hubspot-ma", authorization_token: `Bearer ${TOKEN_PLACEHOLDER}` }], tools: [{ type: "mcp_toolset", mcp_server_name: "hubspot-ma" }] }, null, 2), copyLabel: "JSONをコピー", instructions: ["messages API bodyに追加", '"anthropic-beta": "mcp-client-2025-11-20"'] },
];

interface ToolDef {
  name: string;
  desc: string;
  icon: string;
  api: string;
  params: { name: string; required: boolean; desc: string }[];
}

interface ToolCategory {
  category: string;
  color: string;
  tools: ToolDef[];
}

const TOOL_CATEGORIES: ToolCategory[] = [
  {
    category: "Workflow（Automation v4）",
    color: "#FF7A59",
    tools: [
      { name: "workflow_list", desc: "ワークフロー一覧取得", icon: "📋", api: "GET /automation/v4/flows", params: [] },
      { name: "workflow_get", desc: "ワークフロー詳細取得", icon: "🔍", api: "GET /automation/v4/flows/{flowId}", params: [{ name: "flowId", required: true, desc: "ワークフロー ID" }] },
      { name: "workflow_create", desc: "ワークフロー作成", icon: "✨", api: "POST /automation/v4/flows", params: [{ name: "name", required: true, desc: "ワークフロー名" }, { name: "type", required: true, desc: "CONTACT_FLOW / PLATFORM_FLOW" }, { name: "objectTypeId", required: true, desc: "オブジェクトタイプ ID" }] },
      { name: "workflow_update", desc: "ワークフロー更新", icon: "🔄", api: "PUT /automation/v4/flows/{flowId}", params: [{ name: "flowId", required: true, desc: "ワークフロー ID" }] },
      { name: "workflow_delete", desc: "ワークフロー削除", icon: "🗑", api: "DELETE /automation/v4/flows/{flowId}", params: [{ name: "flowId", required: true, desc: "ワークフロー ID" }, { name: "confirm", required: true, desc: "削除確認（true）" }] },
      { name: "workflow_batch_read", desc: "複数ワークフロー一括取得", icon: "📦", api: "POST /automation/v4/flows/batch/read", params: [{ name: "flowIds", required: true, desc: "ID 配列" }] },
    ],
  },
  {
    category: "CRM Contacts（v3）",
    color: "#00A4BD",
    tools: [
      { name: "contact_search", desc: "コンタクト検索", icon: "🔎", api: "POST /crm/v3/objects/contacts/search", params: [{ name: "query", required: false, desc: "検索キーワード" }, { name: "after", required: false, desc: "ページネーション" }] },
      { name: "contact_get", desc: "コンタクト詳細取得", icon: "👤", api: "GET /crm/v3/objects/contacts/{id}", params: [{ name: "contactId", required: true, desc: "コンタクト ID" }, { name: "associations", required: false, desc: "関連取得" }] },
      { name: "contact_create", desc: "コンタクト作成", icon: "➕", api: "POST /crm/v3/objects/contacts", params: [{ name: "email", required: true, desc: "メールアドレス" }] },
      { name: "contact_update", desc: "コンタクト更新", icon: "✏️", api: "PATCH /crm/v3/objects/contacts/{id}", params: [{ name: "contactId", required: true, desc: "コンタクト ID" }, { name: "properties", required: true, desc: "更新プロパティ" }] },
      { name: "contact_delete", desc: "コンタクト削除", icon: "🗑", api: "DELETE /crm/v3/objects/contacts/{id}", params: [{ name: "contactId", required: true, desc: "コンタクト ID" }, { name: "confirm", required: true, desc: "削除確認（true）" }] },
    ],
  },
  {
    category: "CRM Companies（v3）",
    color: "#00BDA5",
    tools: [
      { name: "company_search", desc: "会社検索", icon: "🏢", api: "POST /crm/v3/objects/companies/search", params: [{ name: "query", required: false, desc: "検索キーワード" }] },
      { name: "company_get", desc: "会社詳細取得", icon: "🏛", api: "GET /crm/v3/objects/companies/{id}", params: [{ name: "companyId", required: true, desc: "会社 ID" }] },
      { name: "company_create", desc: "会社作成", icon: "🏗", api: "POST /crm/v3/objects/companies", params: [{ name: "name", required: true, desc: "会社名" }] },
      { name: "company_update", desc: "会社更新", icon: "✏️", api: "PATCH /crm/v3/objects/companies/{id}", params: [{ name: "companyId", required: true, desc: "会社 ID" }, { name: "properties", required: true, desc: "更新プロパティ" }] },
      { name: "company_delete", desc: "会社削除", icon: "🗑", api: "DELETE /crm/v3/objects/companies/{id}", params: [{ name: "companyId", required: true, desc: "会社 ID" }, { name: "confirm", required: true, desc: "削除確認（true）" }] },
    ],
  },
  {
    category: "CRM Deals（v3）",
    color: "#6A78D1",
    tools: [
      { name: "deal_search", desc: "取引検索", icon: "💰", api: "POST /crm/v3/objects/deals/search", params: [{ name: "query", required: false, desc: "検索キーワード" }] },
      { name: "deal_get", desc: "取引詳細取得", icon: "📊", api: "GET /crm/v3/objects/deals/{id}", params: [{ name: "dealId", required: true, desc: "取引 ID" }] },
      { name: "deal_create", desc: "取引作成", icon: "🤝", api: "POST /crm/v3/objects/deals", params: [{ name: "dealname", required: true, desc: "取引名" }] },
      { name: "deal_update", desc: "取引更新", icon: "💹", api: "PATCH /crm/v3/objects/deals/{id}", params: [{ name: "dealId", required: true, desc: "取引 ID" }, { name: "properties", required: true, desc: "更新プロパティ" }] },
      { name: "deal_delete", desc: "取引削除", icon: "🗑", api: "DELETE /crm/v3/objects/deals/{id}", params: [{ name: "dealId", required: true, desc: "取引 ID" }, { name: "confirm", required: true, desc: "削除確認（true）" }] },
    ],
  },
  {
    category: "CRM Tickets（v3）",
    color: "#F5C26B",
    tools: [
      { name: "ticket_search", desc: "チケット検索", icon: "🎫", api: "POST /crm/v3/objects/tickets/search", params: [{ name: "query", required: false, desc: "検索キーワード" }] },
      { name: "ticket_get", desc: "チケット詳細取得", icon: "🔍", api: "GET /crm/v3/objects/tickets/{id}", params: [{ name: "ticketId", required: true, desc: "チケット ID" }] },
      { name: "ticket_create", desc: "チケット作成", icon: "🎟", api: "POST /crm/v3/objects/tickets", params: [{ name: "subject", required: true, desc: "件名" }] },
      { name: "ticket_update", desc: "チケット更新", icon: "✏️", api: "PATCH /crm/v3/objects/tickets/{id}", params: [{ name: "ticketId", required: true, desc: "チケット ID" }, { name: "properties", required: true, desc: "更新プロパティ" }] },
      { name: "ticket_delete", desc: "チケット削除", icon: "🗑", api: "DELETE /crm/v3/objects/tickets/{id}", params: [{ name: "ticketId", required: true, desc: "チケット ID" }, { name: "confirm", required: true, desc: "削除確認（true）" }] },
    ],
  },
  {
    category: "Notes（メモ / v3）",
    color: "#33475B",
    tools: [
      { name: "note_search", desc: "メモ検索", icon: "🔎", api: "POST /crm/v3/objects/notes/search", params: [{ name: "query", required: false, desc: "検索キーワード" }, { name: "after", required: false, desc: "ページネーション" }] },
      { name: "note_get", desc: "メモ詳細取得", icon: "📝", api: "GET /crm/v3/objects/notes/{id}", params: [{ name: "noteId", required: true, desc: "メモ ID" }, { name: "associations", required: false, desc: "関連取得" }] },
      { name: "note_create", desc: "メモ作成（関連付け可）", icon: "✏️", api: "POST /crm/v3/objects/notes", params: [{ name: "body", required: true, desc: "メモ本文" }, { name: "associations", required: false, desc: "関連付け先" }] },
      { name: "note_update", desc: "メモ更新", icon: "🔄", api: "PATCH /crm/v3/objects/notes/{id}", params: [{ name: "noteId", required: true, desc: "メモ ID" }, { name: "properties", required: true, desc: "更新プロパティ" }] },
      { name: "note_delete", desc: "メモ削除（ゴミ箱・復元可）", icon: "🗑", api: "DELETE /crm/v3/objects/notes/{id}", params: [{ name: "noteId", required: true, desc: "メモ ID" }, { name: "confirm", required: true, desc: "削除確認（true）" }] },
    ],
  },
  {
    category: "Tasks（タスク / v3）",
    color: "#425B76",
    tools: [
      { name: "task_search", desc: "タスク検索", icon: "🔎", api: "POST /crm/v3/objects/tasks/search", params: [{ name: "query", required: false, desc: "検索キーワード" }, { name: "after", required: false, desc: "ページネーション" }] },
      { name: "task_get", desc: "タスク詳細取得", icon: "📋", api: "GET /crm/v3/objects/tasks/{id}", params: [{ name: "taskId", required: true, desc: "タスク ID" }, { name: "associations", required: false, desc: "関連取得" }] },
      { name: "task_create", desc: "タスク作成（関連付け可）", icon: "✅", api: "POST /crm/v3/objects/tasks", params: [{ name: "subject", required: true, desc: "タスク件名" }, { name: "status", required: false, desc: "NOT_STARTED / IN_PROGRESS / COMPLETED" }, { name: "priority", required: false, desc: "LOW / MEDIUM / HIGH" }] },
      { name: "task_update", desc: "タスク更新", icon: "🔄", api: "PATCH /crm/v3/objects/tasks/{id}", params: [{ name: "taskId", required: true, desc: "タスク ID" }, { name: "properties", required: true, desc: "更新プロパティ" }] },
      { name: "task_delete", desc: "タスク削除（ゴミ箱・復元可）", icon: "🗑", api: "DELETE /crm/v3/objects/tasks/{id}", params: [{ name: "taskId", required: true, desc: "タスク ID" }, { name: "confirm", required: true, desc: "削除確認（true）" }] },
    ],
  },
  {
    category: "Associations（関連付け / v4）",
    color: "#2D3E50",
    tools: [
      { name: "association_list", desc: "関連レコード一覧（方向あり）", icon: "🔗", api: "GET /crm/v4/objects/{from}/{id}/associations/{to}", params: [{ name: "fromObjectType", required: true, desc: "元オブジェクト（方向の起点）" }, { name: "fromObjectId", required: true, desc: "元 ID" }, { name: "toObjectType", required: true, desc: "関連先オブジェクト" }] },
      { name: "association_create", desc: "関連付け作成（方向+ラベル対応）", icon: "🔗", api: "POST /crm/v4/associations/{from}/{to}/batch/create", params: [{ name: "fromObjectType", required: true, desc: "元オブジェクト（方向の起点）" }, { name: "fromObjectId", required: true, desc: "元 ID" }, { name: "toObjectType", required: true, desc: "関連先オブジェクト" }, { name: "toObjectId", required: true, desc: "関連先 ID" }, { name: "associationCategory", required: false, desc: "HUBSPOT_DEFINED / USER_DEFINED" }, { name: "associationTypeId", required: false, desc: "方向別タイプID（例: 1=contact→company）" }] },
      { name: "association_delete", desc: "関連付け削除", icon: "✂️", api: "DELETE /crm/v4/.../associations/...", params: [{ name: "fromObjectType", required: true, desc: "元オブジェクト" }, { name: "fromObjectId", required: true, desc: "元 ID" }, { name: "toObjectType", required: true, desc: "関連先オブジェクト" }, { name: "toObjectId", required: true, desc: "関連先 ID" }] },
      { name: "association_labels", desc: "ラベル定義の取得・作成", icon: "🏷", api: "GET/POST /crm/v4/associations/{from}/{to}/labels", params: [{ name: "fromObjectType", required: true, desc: "元オブジェクト" }, { name: "toObjectType", required: true, desc: "関連先オブジェクト" }, { name: "action", required: true, desc: "list / create" }, { name: "label", required: false, desc: "作成時ラベル名" }, { name: "name", required: false, desc: "作成時内部名" }] },
    ],
  },
  {
    category: "Properties（CRUD）",
    color: "#516F90",
    tools: [
      { name: "properties_list", desc: "プロパティ定義一覧", icon: "📑", api: "GET /crm/v3/properties/{objectType}", params: [{ name: "objectType", required: true, desc: "contacts / companies / deals / tickets 等" }] },
      { name: "property_create", desc: "カスタムプロパティ作成", icon: "🏷", api: "POST /crm/v3/properties/{objectType}", params: [{ name: "objectType", required: true, desc: "対象オブジェクト" }, { name: "name", required: true, desc: "内部名" }, { name: "label", required: true, desc: "表示ラベル" }, { name: "type", required: true, desc: "型" }, { name: "fieldType", required: true, desc: "フィールド種別" }, { name: "groupName", required: true, desc: "グループ名" }] },
      { name: "property_update", desc: "プロパティ更新", icon: "✏️", api: "PATCH /crm/v3/properties/{objectType}/{name}", params: [{ name: "objectType", required: true, desc: "対象オブジェクト" }, { name: "propertyName", required: true, desc: "プロパティ内部名" }] },
      { name: "property_delete", desc: "プロパティ削除", icon: "🗑", api: "DELETE /crm/v3/properties/{objectType}/{name}", params: [{ name: "objectType", required: true, desc: "対象オブジェクト" }, { name: "propertyName", required: true, desc: "プロパティ内部名" }, { name: "confirm", required: true, desc: "削除確認（true）" }] },
    ],
  },
  {
    category: "Pipelines（CRUD）",
    color: "#7C98B6",
    tools: [
      { name: "pipeline_list", desc: "パイプライン一覧", icon: "🔧", api: "GET /crm/v3/pipelines/{objectType}", params: [{ name: "objectType", required: true, desc: "deals / tickets" }] },
      { name: "pipeline_create", desc: "パイプライン作成", icon: "🔨", api: "POST /crm/v3/pipelines/{objectType}", params: [{ name: "objectType", required: true, desc: "deals / tickets" }, { name: "label", required: true, desc: "パイプライン名" }, { name: "stages", required: true, desc: "ステージ定義" }] },
      { name: "pipeline_update", desc: "パイプライン更新", icon: "🔄", api: "PATCH /crm/v3/pipelines/{objectType}/{id}", params: [{ name: "objectType", required: true, desc: "deals / tickets" }, { name: "pipelineId", required: true, desc: "パイプライン ID" }] },
      { name: "pipeline_delete", desc: "パイプライン削除", icon: "🗑", api: "DELETE /crm/v3/pipelines/{objectType}/{id}", params: [{ name: "objectType", required: true, desc: "deals / tickets" }, { name: "pipelineId", required: true, desc: "パイプライン ID" }, { name: "confirm", required: true, desc: "削除確認（true）" }] },
    ],
  },
  {
    category: "Line Items（v3）",
    color: "#F2545B",
    tools: [
      { name: "lineitem_search", desc: "明細行検索", icon: "🔎", api: "POST /crm/v3/objects/line_items/search", params: [{ name: "query", required: false, desc: "検索キーワード" }] },
      { name: "lineitem_get", desc: "明細行詳細取得", icon: "📋", api: "GET /crm/v3/objects/line_items/{id}", params: [{ name: "lineItemId", required: true, desc: "明細行 ID" }] },
      { name: "lineitem_create", desc: "明細行作成", icon: "➕", api: "POST /crm/v3/objects/line_items", params: [{ name: "name", required: true, desc: "名前" }, { name: "dealId", required: false, desc: "紐付け取引 ID" }] },
      { name: "lineitem_update", desc: "明細行更新", icon: "✏️", api: "PATCH /crm/v3/objects/line_items/{id}", params: [{ name: "lineItemId", required: true, desc: "明細行 ID" }] },
      { name: "lineitem_delete", desc: "明細行削除", icon: "🗑", api: "DELETE /crm/v3/objects/line_items/{id}", params: [{ name: "lineItemId", required: true, desc: "明細行 ID" }, { name: "confirm", required: true, desc: "削除確認（true）" }] },
    ],
  },
  {
    category: "Products（v3）",
    color: "#00BDA5",
    tools: [
      { name: "product_search", desc: "商品検索", icon: "🛍", api: "POST /crm/v3/objects/products/search", params: [{ name: "query", required: false, desc: "検索キーワード" }] },
      { name: "product_get", desc: "商品詳細取得", icon: "📦", api: "GET /crm/v3/objects/products/{id}", params: [{ name: "productId", required: true, desc: "商品 ID" }] },
      { name: "product_create", desc: "商品登録", icon: "➕", api: "POST /crm/v3/objects/products", params: [{ name: "name", required: true, desc: "商品名" }] },
      { name: "product_update", desc: "商品更新", icon: "✏️", api: "PATCH /crm/v3/objects/products/{id}", params: [{ name: "productId", required: true, desc: "商品 ID" }, { name: "properties", required: true, desc: "更新プロパティ" }] },
      { name: "product_delete", desc: "商品削除", icon: "🗑", api: "DELETE /crm/v3/objects/products/{id}", params: [{ name: "productId", required: true, desc: "商品 ID" }, { name: "confirm", required: true, desc: "削除確認（true）" }] },
    ],
  },
  {
    category: "CMS（Blog & Pages）",
    color: "#FF8F59",
    tools: [
      { name: "cms_blog_list", desc: "ブログ記事一覧", icon: "📝", api: "GET /cms/v3/blogs/posts", params: [{ name: "limit", required: false, desc: "件数" }] },

      { name: "cms_blog_update", desc: "ブログ記事更新", icon: "✍️", api: "PATCH /cms/v3/blogs/posts/{id}", params: [{ name: "postId", required: true, desc: "記事 ID" }] },
      { name: "cms_page_list", desc: "ページ一覧", icon: "📄", api: "GET /cms/v3/pages/{type}", params: [{ name: "pageType", required: true, desc: "landing-pages / site-pages" }] },
      { name: "cms_page_update", desc: "ページ更新", icon: "🖊", api: "PATCH /cms/v3/pages/{type}/{id}", params: [{ name: "pageType", required: true, desc: "landing-pages / site-pages" }, { name: "pageId", required: true, desc: "ページ ID" }] },
    ],
  },
  {
    category: "Forms（フォーム / v3）",
    color: "#FF6B4A",
    tools: [
      { name: "form_list", desc: "フォーム一覧取得", icon: "📝", api: "GET /marketing/v3/forms", params: [{ name: "limit", required: false, desc: "件数" }, { name: "formTypes", required: false, desc: "hubspot/captured/flow/blog_comment" }] },
      { name: "form_get", desc: "フォーム詳細取得", icon: "🔍", api: "GET /marketing/v3/forms/:id", params: [{ name: "formId", required: true, desc: "フォームID (UUID)" }] },
      { name: "form_create", desc: "フォーム作成", icon: "✨", api: "POST /marketing/v3/forms", params: [{ name: "name", required: true, desc: "フォーム名" }, { name: "fieldGroups", required: true, desc: "フィールド定義" }] },
      { name: "form_update", desc: "フォーム更新（PUT全体置換）", icon: "✍️", api: "PUT /marketing/v3/forms/:id", params: [{ name: "formId", required: true, desc: "フォームID" }, { name: "fieldGroups", required: true, desc: "フィールド定義" }] },
      { name: "form_delete", desc: "フォームアーカイブ", icon: "🗑️", api: "DELETE /marketing/v3/forms/:id", params: [{ name: "formId", required: true, desc: "フォームID" }, { name: "confirm", required: true, desc: "true" }] },
    ],
  },
  {
    category: "Lists / Segments（リスト / v3）",
    color: "#4A90D9",
    tools: [
      { name: "list_create", desc: "リスト作成", icon: "📋", api: "POST /crm/v3/lists", params: [{ name: "name", required: true, desc: "リスト名" }, { name: "objectTypeId", required: true, desc: "0-1=コンタクト等" }, { name: "processingType", required: true, desc: "MANUAL/DYNAMIC/SNAPSHOT" }] },
      { name: "list_search", desc: "リスト検索", icon: "🔍", api: "POST /crm/v3/lists/search", params: [{ name: "query", required: false, desc: "名前キーワード" }, { name: "processingTypes", required: false, desc: "処理タイプ" }] },
      { name: "list_get", desc: "リスト詳細取得", icon: "📄", api: "GET /crm/v3/lists/:id", params: [{ name: "listId", required: true, desc: "ILS List ID" }, { name: "includeFilters", required: false, desc: "フィルタ含む" }] },
      { name: "list_delete", desc: "リスト削除（90日復元可）", icon: "🗑️", api: "DELETE /crm/v3/lists/:id", params: [{ name: "listId", required: true, desc: "ILS List ID" }, { name: "confirm", required: true, desc: "true" }] },
      { name: "list_members_get", desc: "メンバー一覧取得", icon: "👥", api: "GET /crm/v3/lists/:id/memberships", params: [{ name: "listId", required: true, desc: "ILS List ID" }, { name: "limit", required: false, desc: "件数" }] },
      { name: "list_members_add", desc: "メンバー追加", icon: "➕", api: "PUT /crm/v3/lists/:id/memberships/add", params: [{ name: "listId", required: true, desc: "ILS List ID" }, { name: "recordIds", required: true, desc: "レコードID配列" }] },
      { name: "list_members_remove", desc: "メンバー削除", icon: "➖", api: "PUT /crm/v3/lists/:id/memberships/remove", params: [{ name: "listId", required: true, desc: "ILS List ID" }, { name: "recordIds", required: true, desc: "レコードID配列" }] },
    ],
  },
  {
    category: "Marketing Emails（マーケティングメール / v3）",
    color: "#E74C8B",
    tools: [
      { name: "marketing_email_list", desc: "メール一覧取得（統計対応）", icon: "📧", api: "GET /marketing/v3/emails", params: [{ name: "limit", required: false, desc: "件数" }, { name: "includeStats", required: false, desc: "統計含む" }] },

      { name: "marketing_email_get", desc: "メール詳細取得", icon: "🔍", api: "GET /marketing/v3/emails/:id", params: [{ name: "emailId", required: true, desc: "メールID" }, { name: "includeStats", required: false, desc: "統計含む" }] },
      { name: "marketing_email_create", desc: "メール作成（DRAFT）", icon: "✨", api: "POST /marketing/v3/emails", params: [{ name: "name", required: true, desc: "メール名" }, { name: "subject", required: true, desc: "件名" }] },
      { name: "marketing_email_update", desc: "メール更新（PATCH）", icon: "✍️", api: "PATCH /marketing/v3/emails/:id", params: [{ name: "emailId", required: true, desc: "メールID" }, { name: "properties", required: true, desc: "更新内容" }] },
      { name: "marketing_email_delete", desc: "メールアーカイブ", icon: "🗑️", api: "DELETE /marketing/v3/emails/:id", params: [{ name: "emailId", required: true, desc: "メールID" }, { name: "confirm", required: true, desc: "true" }] },
      { name: "marketing_email_clone", desc: "メール複製", icon: "📋", api: "POST /marketing/v3/emails/:id/clone", params: [{ name: "emailId", required: true, desc: "複製元ID" }, { name: "name", required: false, desc: "新メール名" }] },
      { name: "marketing_email_publish", desc: "メール送信（Enterprise必須）", icon: "🚀", api: "POST /marketing/v3/emails/:id/publish", params: [{ name: "emailId", required: true, desc: "メールID" }, { name: "confirm", required: true, desc: "true" }] },
    ],
  },
  {
    category: "Single-Send（個別メール送信 / v4）",
    color: "#E74C8B",
    tools: [
      { name: "single_send_email", desc: "テンプレートメール1通送信（Enterprise必須）", icon: "📨", api: "POST /marketing/v4/email/single-send", params: [{ name: "emailId", required: true, desc: "テンプレートID" }, { name: "to", required: true, desc: "宛先メール" }] },
      { name: "single_send_status", desc: "送信ステータス確認", icon: "📊", api: "GET /marketing/v3/email/send-statuses/:id", params: [{ name: "statusId", required: true, desc: "ステータスID" }] },
    ],
  },
  {
    category: "Campaigns（キャンペーン / v3）",
    color: "#8B5CF6",
    tools: [
      { name: "campaign_list", desc: "キャンペーン一覧取得", icon: "📋", api: "GET /marketing/v3/campaigns", params: [{ name: "limit", required: false, desc: "件数" }] },
      { name: "campaign_get", desc: "キャンペーン詳細取得", icon: "🔍", api: "GET /marketing/v3/campaigns/:id", params: [{ name: "campaignId", required: true, desc: "キャンペーンGUID" }] },
      { name: "campaign_create", desc: "キャンペーン作成", icon: "✨", api: "POST /marketing/v3/campaigns", params: [{ name: "hs_name", required: true, desc: "キャンペーン名" }] },
      { name: "campaign_update", desc: "キャンペーン更新（PATCH）", icon: "✍️", api: "PATCH /marketing/v3/campaigns/:id", params: [{ name: "campaignId", required: true, desc: "キャンペーンGUID" }] },
      { name: "campaign_asset_associate", desc: "アセット紐付け/解除", icon: "🔗", api: "PUT/DELETE /campaigns/:id/assets/:type/:assetId", params: [{ name: "assetType", required: true, desc: "MARKETING_EMAIL/FORM/WORKFLOW等" }] },
    ],
  },
  {
    category: "Custom Events（カスタムイベント / v3）",
    color: "#10B981",
    tools: [
      { name: "custom_event_define", desc: "イベント定義作成", icon: "📐", api: "POST /events/v3/event-definitions", params: [{ name: "name", required: false, desc: "イベント内部名" }, { name: "primaryObject", required: true, desc: "CONTACT等" }] },

      { name: "custom_event_send", desc: "イベント送信", icon: "📡", api: "POST /events/v3/send", params: [{ name: "eventName", required: true, desc: "完全修飾名" }] },
      { name: "custom_event_list_definitions", desc: "イベント定義一覧", icon: "📋", api: "GET /events/v3/event-definitions", params: [{ name: "searchString", required: false, desc: "検索文字列" }] },
      { name: "custom_event_get_occurrences", desc: "イベント発生データ取得", icon: "📊", api: "GET /events/v3/events", params: [{ name: "eventType", required: false, desc: "イベントタイプ" }] },
    ],
  },
  {
    category: "Knowledge Store & Context",
    color: "#F59E0B",
    tools: [
      { name: "hubspot_knowledge_setup", desc: "Knowledge Store 初回セットアップ", icon: "🏗️", api: "Internal (contacts + notes)", params: [] },
      { name: "hubspot_knowledge_get", desc: "ナレッジ取得（設計思想・命名規則・パターン）", icon: "🧠", api: "Internal (notes search)", params: [{ name: "category", required: false, desc: "カテゴリ指定" }] },
      { name: "hubspot_knowledge_update", desc: "ナレッジ更新（replace/append）", icon: "✏️", api: "Internal (notes update)", params: [{ name: "category", required: true, desc: "カテゴリ" }, { name: "mode", required: true, desc: "replace/append" }] },
      { name: "hubspot_context_snapshot", desc: "HubSpot設定一括スナップショット", icon: "📸", api: "Internal (multi-API)", params: [{ name: "sections", required: false, desc: "取得セクション" }] },
      { name: "hubspot_knowledge_build", desc: "既存設定→10カテゴリ自動分析+質問生成", icon: "🎓", api: "Internal (snapshot→analyze→save)", params: [{ name: "force", required: false, desc: "既存上書き" }] },
    ],
  },
  {
    category: "Owners",
    color: "#7C8DB5",
    tools: [
      { name: "owner_list", desc: "担当者（オーナー）一覧取得", icon: "👤", api: "GET /crm/v3/owners", params: [{ name: "limit", required: false, desc: "取得件数" }] },
      { name: "owner_get", desc: "担当者詳細取得", icon: "🔍", api: "GET /crm/v3/owners/:id", params: [{ name: "ownerId", required: true, desc: "オーナーID" }] },
    ],
  },
  {
    category: "Emails（メールエンゲージメント）",
    color: "#00BDA5",
    tools: [
      { name: "email_search", desc: "メール検索", icon: "🔎", api: "POST /crm/v3/objects/emails/search", params: [{ name: "query", required: false, desc: "検索キーワード" }] },
      { name: "email_get", desc: "メール詳細取得", icon: "📧", api: "GET /crm/v3/objects/emails/:id", params: [{ name: "emailId", required: true, desc: "メールID" }] },
      { name: "email_create", desc: "メール作成", icon: "➕", api: "POST /crm/v3/objects/emails", params: [{ name: "properties", required: true, desc: "メールプロパティ" }] },
      { name: "email_update", desc: "メール更新", icon: "✏️", api: "PATCH /crm/v3/objects/emails/:id", params: [{ name: "emailId", required: true, desc: "メールID" }] },
      { name: "email_delete", desc: "メール永久削除（復元不可）", icon: "🗑", api: "DELETE /crm/v3/objects/emails/:id", params: [{ name: "emailId", required: true, desc: "メールID" }] },
    ],
  },
  {
    category: "Meetings（ミーティング）",
    color: "#00A4BD",
    tools: [
      { name: "meeting_search", desc: "ミーティング検索", icon: "🔎", api: "POST /crm/v3/objects/meetings/search", params: [{ name: "query", required: false, desc: "検索キーワード" }] },
      { name: "meeting_get", desc: "ミーティング詳細取得", icon: "📅", api: "GET /crm/v3/objects/meetings/:id", params: [{ name: "meetingId", required: true, desc: "ミーティングID" }] },
      { name: "meeting_create", desc: "ミーティング作成", icon: "➕", api: "POST /crm/v3/objects/meetings", params: [{ name: "properties", required: true, desc: "ミーティングプロパティ" }] },
      { name: "meeting_update", desc: "ミーティング更新", icon: "✏️", api: "PATCH /crm/v3/objects/meetings/:id", params: [{ name: "meetingId", required: true, desc: "ミーティングID" }] },
      { name: "meeting_delete", desc: "ミーティング削除", icon: "🗑", api: "DELETE /crm/v3/objects/meetings/:id", params: [{ name: "meetingId", required: true, desc: "ミーティングID" }] },
    ],
  },
  {
    category: "Calls（通話）",
    color: "#516F90",
    tools: [
      { name: "call_search", desc: "通話検索", icon: "🔎", api: "POST /crm/v3/objects/calls/search", params: [{ name: "query", required: false, desc: "検索キーワード" }] },
      { name: "call_get", desc: "通話詳細取得", icon: "📞", api: "GET /crm/v3/objects/calls/:id", params: [{ name: "callId", required: true, desc: "通話ID" }] },
      { name: "call_create", desc: "通話作成", icon: "➕", api: "POST /crm/v3/objects/calls", params: [{ name: "properties", required: true, desc: "通話プロパティ" }] },
      { name: "call_update", desc: "通話更新", icon: "✏️", api: "PATCH /crm/v3/objects/calls/:id", params: [{ name: "callId", required: true, desc: "通話ID" }] },
      { name: "call_delete", desc: "通話削除", icon: "🗑", api: "DELETE /crm/v3/objects/calls/:id", params: [{ name: "callId", required: true, desc: "通話ID" }] },
    ],
  },
  {
    category: "Quotes（見積もり）",
    color: "#F5A623",
    tools: [
      { name: "quote_search", desc: "見積もり検索", icon: "🔎", api: "POST /crm/v3/objects/quotes/search", params: [{ name: "query", required: false, desc: "検索キーワード" }] },
      { name: "quote_get", desc: "見積もり詳細取得", icon: "💰", api: "GET /crm/v3/objects/quotes/:id", params: [{ name: "quoteId", required: true, desc: "見積もりID" }] },
    ],
  }
];

function CopyBtn({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); } catch {
      const t = document.createElement("textarea");
      t.value = text; document.body.appendChild(t); t.select();
      document.execCommand("copy"); document.body.removeChild(t);
    }
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };
  return (<button onClick={copy} className="hs-btn hs-btn--primary" style={{ gap: 6 }}>{copied ? "✓ コピー完了" : label}</button>);
}

function ClientRow({ c }: { c: ClientConfig }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="hs-accordion">
      <button className="hs-accordion__trigger" onClick={() => setOpen(!open)}>
        <span className="hs-accordion__icon">{c.icon}</span>
        <span className="hs-accordion__content"><strong>{c.name}</strong><span className="hs-accordion__desc">{c.description}</span></span>
        <svg className={`hs-accordion__chevron ${open ? "hs-accordion__chevron--open" : ""}`} width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M5 8l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </button>
      {open && (
        <div className="hs-accordion__body">
          <ol className="hs-steps">{c.instructions.map((s, i) => <li key={i}>{s}</li>)}</ol>
          {c.note && <div className="hs-callout">{c.note}</div>}
          <pre className="hs-code"><code>{c.copyContent}</code></pre>
          <CopyBtn text={c.copyContent} label={c.copyLabel} />
        </div>
      )}
    </div>
  );
}

function ToolCard({ tool, accentColor }: { tool: ToolDef; accentColor: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="hs-tool-card"
      style={{ cursor: "pointer", borderColor: open ? accentColor : undefined, boxShadow: open ? `0 4px 16px ${accentColor}18` : undefined }}
      onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 18 }}>{tool.icon}</span>
          <div>
            <div className="hs-tool-card__name">{tool.name}</div>
            <div className="hs-tool-card__desc">{tool.desc}</div>
          </div>
        </div>
        <svg width="16" height="16" viewBox="0 0 20 20" fill="none" style={{ transition: "transform 0.2s", transform: open ? "rotate(180deg)" : "rotate(0deg)", flexShrink: 0, color: "#516F90" }}>
          <path d="M5 8l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      {open && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid var(--hs-border)`, animation: "slideIn 0.2s ease" }}>
          <div style={{ fontFamily: "'SF Mono','Fira Code',monospace", fontSize: 12, color: accentColor, marginBottom: 10, fontWeight: 600 }}>{tool.api}</div>
          {tool.params.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {tool.params.map((p) => (
                <div key={p.name} style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 12 }}>
                  <code style={{ background: "var(--hs-bg)", padding: "2px 6px", borderRadius: 4, fontWeight: 600, color: "var(--hs-obsidian)", whiteSpace: "nowrap" }}>{p.name}</code>
                  {p.required && <span style={{ color: "var(--hs-orange)", fontWeight: 700, fontSize: 10 }}>必須</span>}
                  <span style={{ color: "var(--hs-text-light)" }}>{p.desc}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CategoryCard({ cat }: { cat: ToolCategory }) {
  const [expanded, setExpanded] = useState(false);
  const iconMap: Record<string, string> = {
    "Workflow": "⚡", "Contacts": "👤", "Companies": "🏢", "Deals": "💰",
    "Tickets": "🎫", "Notes": "📝", "Tasks": "✅", "Associations": "🔗",
    "Properties": "🏷", "Pipelines": "🔧", "Line Items": "📋", "Products": "📦", "CMS": "🌐",
  };
  const catKey = Object.keys(iconMap).find(k => cat.category.includes(k)) || "";
  const icon = iconMap[catKey] || "🔧";
  return (
    <div className={`hs-category-card ${expanded ? "hs-category-card--open" : ""}`} style={{ borderColor: expanded ? cat.color : undefined }}>
      <button className="hs-category-card__header" onClick={() => setExpanded(!expanded)}>
        <div className="hs-category-card__icon" style={{ background: `${cat.color}14`, color: cat.color }}>{icon}</div>
        <div className="hs-category-card__info">
          <div className="hs-category-card__title">{cat.category}</div>
          <div className="hs-category-card__count">{cat.tools.length} tools</div>
        </div>
        <svg className={`hs-category-card__chevron ${expanded ? "hs-category-card__chevron--open" : ""}`} width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M5 8l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      {expanded && (
        <div className="hs-category-card__body">
          {cat.tools.map((t) => <ToolCard key={t.name} tool={t} accentColor={cat.color} />)}
        </div>
      )}
    </div>
  );
}
export default function Home() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const totalTools = TOOL_CATEGORIES.reduce((sum, c) => sum + c.tools.length, 0);
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lexend+Deca:wght@300;400;500;600;700;800&display=swap');
        :root{--hs-orange:#FF7A59;--hs-orange-dark:#E8603C;--hs-orange-light:#FFF1EE;--hs-slate:#33475B;--hs-obsidian:#2D3E50;--hs-calypso:#00A4BD;--hs-calypso-light:#E5F5F8;--hs-text:#33475B;--hs-text-light:#516F90;--hs-border:#CBD6E2;--hs-bg:#F5F8FA;--hs-white:#FFFFFF;--hs-radius:8px;--hs-radius-lg:16px;--hs-shadow:0 1px 3px rgba(45,62,80,0.06);--hs-shadow-md:0 4px 12px rgba(45,62,80,0.08);--hs-shadow-lg:0 8px 30px rgba(45,62,80,0.1)}
        *{box-sizing:border-box;margin:0;padding:0}html{scroll-behavior:smooth}
        body{font-family:'Lexend Deca',-apple-system,BlinkMacSystemFont,sans-serif;color:var(--hs-text);background:var(--hs-white);-webkit-font-smoothing:antialiased;line-height:1.6}
        .hs-nav{position:sticky;top:0;z-index:100;background:rgba(255,255,255,0.95);backdrop-filter:blur(12px);border-bottom:1px solid var(--hs-border);padding:0 24px}
        .hs-nav__inner{max-width:1080px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;height:64px}
        .hs-nav__brand{display:flex;align-items:center;gap:10px;text-decoration:none;color:var(--hs-obsidian);font-weight:700;font-size:17px;letter-spacing:-0.02em}
        .hs-nav__links{display:flex;gap:28px;list-style:none}
        .hs-nav__links a{color:var(--hs-text-light);text-decoration:none;font-size:14px;font-weight:500;transition:color 0.15s}
        .hs-nav__links a:hover{color:var(--hs-orange)}
        .hs-badge{display:inline-flex;align-items:center;gap:6px;background:#DBFAE6;color:#00875A;font-size:12px;font-weight:600;padding:4px 12px;border-radius:100px}
        .hs-badge__dot{width:6px;height:6px;background:#00875A;border-radius:50%;animation:dotPulse 2s ease-in-out infinite}
        @keyframes dotPulse{0%,100%{opacity:1}50%{opacity:0.4}}
        .hs-hero{background:linear-gradient(170deg,var(--hs-white) 0%,var(--hs-orange-light) 50%,var(--hs-white) 100%);padding:80px 24px 60px;text-align:center;position:relative;overflow:hidden}
        .hs-hero::before{content:'';position:absolute;top:-200px;right:-200px;width:600px;height:600px;background:radial-gradient(circle,rgba(255,122,89,0.06) 0%,transparent 70%);pointer-events:none}
        .hs-hero__inner{max-width:680px;margin:0 auto;position:relative}
        .hs-hero__tag{display:inline-flex;align-items:center;gap:8px;background:var(--hs-white);border:1px solid var(--hs-border);border-radius:100px;padding:6px 16px 6px 8px;font-size:13px;color:var(--hs-text-light);font-weight:500;margin-bottom:28px;box-shadow:var(--hs-shadow)}
        .hs-hero__tag-icon{background:var(--hs-orange);color:white;width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700}
        .hs-hero h1{font-size:clamp(32px,5.5vw,52px);font-weight:800;color:var(--hs-obsidian);letter-spacing:-0.035em;line-height:1.15;margin-bottom:20px}
        .hs-hero h1 span{color:var(--hs-orange)}
        .hs-hero__sub{font-size:18px;color:var(--hs-text-light);font-weight:400;max-width:540px;margin:0 auto 36px;line-height:1.7}
        .hs-hero__endpoint{display:inline-flex;align-items:center;gap:12px;background:var(--hs-white);border:1px solid var(--hs-border);border-radius:var(--hs-radius);padding:12px 14px 12px 20px;font-family:'SF Mono','Fira Code',monospace;font-size:14px;color:var(--hs-obsidian);box-shadow:var(--hs-shadow-md)}
        .hs-section{max-width:960px;margin:0 auto;padding:64px 24px}
        .hs-section__label{display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:var(--hs-orange);margin-bottom:8px}
        .hs-section__title{font-size:28px;font-weight:700;color:var(--hs-obsidian);letter-spacing:-0.025em;margin-bottom:12px}
        .hs-section__desc{font-size:15px;color:var(--hs-text-light);max-width:600px;margin-bottom:32px;line-height:1.7}
        .hs-divider{max-width:960px;margin:0 auto;height:1px;background:var(--hs-border)}
        .hs-auth-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:16px}
        .hs-auth-card{background:var(--hs-white);border:1px solid var(--hs-border);border-radius:var(--hs-radius-lg);padding:28px;transition:box-shadow 0.2s,border-color 0.2s}
        .hs-auth-card:hover{box-shadow:var(--hs-shadow-lg);border-color:var(--hs-orange)}
        .hs-auth-card__badge{display:inline-block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;padding:3px 10px;border-radius:4px;margin-bottom:14px}
        .hs-auth-card__badge--rec{background:#DBFAE6;color:#00875A}
        .hs-auth-card__badge--alt{background:var(--hs-calypso-light);color:#0091AE}
        .hs-auth-card h4{font-size:17px;font-weight:700;color:var(--hs-obsidian);margin-bottom:8px}
        .hs-auth-card p{font-size:14px;color:var(--hs-text-light);line-height:1.65}
        .hs-auth-card code{background:var(--hs-bg);padding:2px 7px;border-radius:4px;font-size:12px;font-family:'SF Mono','Fira Code',monospace;color:var(--hs-obsidian)}
        .hs-btn{display:inline-flex;align-items:center;justify-content:center;border:none;border-radius:var(--hs-radius);font-family:inherit;font-size:14px;font-weight:600;padding:10px 20px;cursor:pointer;transition:all 0.15s;letter-spacing:-0.01em}
        .hs-btn--primary{background:var(--hs-orange);color:white}
        .hs-btn--primary:hover{background:var(--hs-orange-dark)}
        .hs-accordion{background:var(--hs-white);border:1px solid var(--hs-border);border-radius:var(--hs-radius-lg);overflow:hidden;transition:box-shadow 0.2s}
        .hs-accordion:hover{box-shadow:var(--hs-shadow-md)}
        .hs-accordion__trigger{width:100%;background:transparent;border:none;padding:18px 24px;display:flex;align-items:center;gap:14px;cursor:pointer;font-family:inherit;text-align:left;color:var(--hs-text)}
        .hs-accordion__icon{width:40px;height:40px;background:var(--hs-bg);border-radius:var(--hs-radius);display:flex;align-items:center;justify-content:center;font-size:18px;color:var(--hs-orange);flex-shrink:0}
        .hs-accordion__content{flex:1;display:flex;flex-direction:column;gap:2px}
        .hs-accordion__content strong{font-size:15px;font-weight:600;color:var(--hs-obsidian)}
        .hs-accordion__desc{font-size:13px;color:var(--hs-text-light)}
        .hs-accordion__chevron{color:var(--hs-text-light);transition:transform 0.25s;flex-shrink:0}
        .hs-accordion__chevron--open{transform:rotate(180deg)}
        .hs-accordion__body{padding:0 24px 24px;border-top:1px solid var(--hs-border);animation:slideIn 0.25s ease}
        @keyframes slideIn{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}
        .hs-accordion + .hs-accordion{margin-top:8px}
        .hs-steps{padding:16px 0 12px 20px;font-size:14px;line-height:1.8;color:var(--hs-text)}
        .hs-callout{background:#FEF3E2;border-left:3px solid #F5A623;border-radius:4px;padding:10px 14px;font-size:13px;color:#7A5100;margin-bottom:12px;line-height:1.6}
        .hs-code{background:var(--hs-obsidian);color:#E2E8F0;border-radius:var(--hs-radius);padding:16px 20px;overflow-x:auto;font-size:12px;line-height:1.7;font-family:'SF Mono','Fira Code',monospace;margin-bottom:16px}
        .hs-tool-card{background:var(--hs-white);border:1px solid var(--hs-border);border-radius:var(--hs-radius-lg);padding:18px 20px;transition:all 0.2s;user-select:none}
        .hs-tool-card:hover{border-color:var(--hs-orange);box-shadow:var(--hs-shadow-md)}
        .hs-tool-card__name{font-family:'SF Mono','Fira Code',monospace;font-size:13px;color:var(--hs-obsidian);font-weight:600}
        .hs-tool-card__desc{font-size:12px;color:var(--hs-text-light);margin-top:1px}
        .hs-cat-header{display:flex;align-items:center;gap:10px;margin-bottom:12px;margin-top:28px}
        .hs-cat-header:first-child{margin-top:0}
        .hs-cat-dot{width:10px;height:10px;border-radius:3px;flex-shrink:0}
        .hs-cat-label{font-size:14px;font-weight:700;color:var(--hs-obsidian);letter-spacing:-0.01em}
        .hs-cat-count{font-size:12px;color:var(--hs-text-light);font-weight:500}
        .hs-specs{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px}
        .hs-spec{background:var(--hs-bg);border-radius:var(--hs-radius);padding:18px 20px}
        .hs-spec__label{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:var(--hs-text-light);margin-bottom:4px}
        .hs-spec__value{font-size:15px;font-weight:700;color:var(--hs-obsidian)}
        .hs-cta-banner{background:var(--hs-obsidian);border-radius:var(--hs-radius-lg);padding:48px 32px;text-align:center;margin-top:16px}
        .hs-cta-banner h3{font-size:24px;font-weight:700;color:white;margin-bottom:12px;letter-spacing:-0.02em}
        .hs-cta-banner p{font-size:15px;color:#A3B8CC;margin-bottom:24px}
        .hs-cta-banner .hs-btn--primary{font-size:15px;padding:12px 28px}
        .hs-footer{max-width:960px;margin:0 auto;padding:32px 24px 48px;text-align:center;font-size:13px;color:var(--hs-text-light)}
        .hs-footer a{color:var(--hs-text-light);text-decoration:underline;text-underline-offset:3px}
        .hs-footer a:hover{color:var(--hs-orange)}
        .hs-fade{opacity:0;transform:translateY(16px);transition:opacity 0.6s ease,transform 0.6s ease}
        .hs-category-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px}
        .hs-category-card{background:var(--hs-white);border:1px solid var(--hs-border);border-radius:var(--hs-radius-lg);overflow:hidden;transition:all 0.2s}
        .hs-category-card:hover{box-shadow:var(--hs-shadow-md)}
        .hs-category-card--open{grid-column:1/-1;box-shadow:var(--hs-shadow-lg)}
        .hs-category-card__header{width:100%;background:transparent;border:none;padding:20px;display:flex;align-items:center;gap:14px;cursor:pointer;font-family:inherit;text-align:left;color:var(--hs-text)}
        .hs-category-card__icon{width:44px;height:44px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0}
        .hs-category-card__info{flex:1;display:flex;flex-direction:column;gap:2px}
        .hs-category-card__title{font-size:14px;font-weight:700;color:var(--hs-obsidian);letter-spacing:-0.01em}
        .hs-category-card__count{font-size:12px;color:var(--hs-text-light);font-weight:500}
        .hs-category-card__chevron{color:var(--hs-text-light);transition:transform 0.25s;flex-shrink:0}
        .hs-category-card__chevron--open{transform:rotate(180deg)}
        .hs-category-card__body{padding:0 20px 20px;display:flex;flex-direction:column;gap:8px;animation:slideIn 0.25s ease}
        .hs-fade--in{opacity:1;transform:translateY(0)}
        @media(max-width:640px){.hs-nav__links{display:none}.hs-hero{padding:48px 20px 40px}.hs-hero h1{font-size:28px}.hs-hero__sub{font-size:15px}.hs-section{padding:40px 20px}.hs-auth-grid{grid-template-columns:1fr}.hs-hero__endpoint{font-size:11px;flex-wrap:wrap;justify-content:center}}
      `}</style>

      <nav className="hs-nav">
        <div className="hs-nav__inner">
          <a href="#" className="hs-nav__brand"><Sprocket size={28} />HubSpot MA</a>
          <ul className="hs-nav__links">
            <li><a href="#auth">認証</a></li>
            <li><a href="#setup">セットアップ</a></li>
            <li><a href="#tools">ツール</a></li>
            <li><a href="#specs">技術仕様</a></li>
          </ul>
          <span className="hs-badge"><span className="hs-badge__dot" /> Operational</span>
        </div>
      </nav>

      <section className="hs-hero">
        <div className={`hs-hero__inner hs-fade ${mounted ? "hs-fade--in" : ""}`}>
          <div className="hs-hero__tag">
            <span className="hs-hero__tag-icon">⚡</span>
            116 MCP Tools + Knowledge Store + Claude Skill
          </div>
          <h1>AIを<span>HubSpot</span>の<br />マーケティング担当者にする</h1>
          <p className="hs-hero__sub">「セミナーやるからよろしく」で動くAI。116のMCPツール + 暗黙知を学習するKnowledge Store + 行動規範のClaude Skill。単なるAPIラッパーではなく、あなたの会社のHubSpotを理解したMA担当者として機能します。</p>
          <div className="hs-hero__endpoint">
            <span style={{ color: "var(--hs-text-light)", fontSize: 12 }}>ENDPOINT</span>
            <span>{MCP_URL}</span>
            <CopyBtn text={MCP_URL} label="コピー" />
          </div>
        </div>
      </section>


      <div className="hs-divider" />
      <section className="hs-section">
        <div className="hs-section__label"><Sprocket size={14} /> WHY THIS EXISTS</div>
        <h2 className="hs-section__title">なぜこれが必要か</h2>
        <p className="hs-section__desc">HubSpot APIを叩けるだけではMA担当者にはなれません。本当の担当者は「うちのやり方」を知っています。</p>
        <div className="hs-auth-grid">
          <div className="hs-auth-card">
            <span className="hs-auth-card__badge hs-auth-card__badge--alt">🔧 従来のMCP</span>
            <h4>APIラッパー</h4>
            <p>「フォーム作って」→ 作れる。「メール送って」→ 送れる。でも命名規則を知らない。禁止事項を知らない。過去のパターンを知らない。<strong>毎回ゼロから指示が必要。</strong></p>
          </div>
          <div className="hs-auth-card">
            <span className="hs-auth-card__badge hs-auth-card__badge--rec">🧠 このMCP</span>
            <h4>MA担当者</h4>
            <p>「セミナーよろしく」→ 過去のパターンを参照し、命名規則に従い、禁止事項を確認し、80%を自分で組んで提案。<strong>使うほど賢くなる。</strong></p>
          </div>
        </div>
      </section>

      <div className="hs-divider" />
      <section className="hs-section">
        <div className="hs-section__label"><Sprocket size={14} /> ARCHITECTURE</div>
        <h2 className="hs-section__title">3層アーキテクチャ</h2>
        <p className="hs-section__desc">Skill（固定・全企業共通）+ Knowledge Store（可変・企業固有）+ MCPツール（API操作）の3層で構成。</p>
        <div style={{ display: "grid", gap: 16, maxWidth: 640, margin: "0 auto" }}>
          <div className="hs-auth-card" style={{ borderLeft: "3px solid var(--hs-orange)" }}>
            <h4>🎯 Claude Skill（判断規範）</h4>
            <p>MA担当者としての行動規範。「Knowledge Storeを毎回読め」「記載がないことは推測するな」「施策後は必ず記録しろ」。<strong>全企業共通。書き換え不要。</strong></p>
          </div>
          <div className="hs-auth-card" style={{ borderLeft: "3px solid #4A90D9" }}>
            <h4>🧠 Knowledge Store（企業の記憶）</h4>
            <p>設計判断・命名規則・手順書・禁止事項・過去施策等の10カテゴリ。<strong>HubSpot内のCRMノートに保存。追加インフラ不要。</strong>初回は自動分析+質問で構築、以降は施策実行のたびに自動成長。</p>
          </div>
          <div className="hs-auth-card" style={{ borderLeft: "3px solid #10B981" }}>
            <h4>🔧 116 MCPツール（操作能力）</h4>
            <p>CRM・フォーム・リスト・メール・WF・キャンペーン・イベント等、HubSpot APIを完全カバー。Skillの指示とKnowledgeの知識に基づいて動く「手足」。</p>
          </div>
        </div>
      </section>

      <div className="hs-divider" />
      <section className="hs-section">
        <div className="hs-section__label"><Sprocket size={14} /> GETTING STARTED</div>
        <h2 className="hs-section__title">3ステップで始める</h2>
        <div style={{ display: "grid", gap: 16, maxWidth: 640, margin: "0 auto" }}>
          <div className="hs-auth-card">
            <h4>① HubSpot Private Appを作成</h4>
            <p>Settings → Integrations → Private Apps → Create。必要なスコープを付与してAccess Tokenをコピー。</p>
          </div>
          <div className="hs-auth-card">
            <h4>② MCPサーバーを接続</h4>
            <p>Claude.ai / Claude Desktop / Cursor / VS Code 等から接続。Authorizationヘッダーにトークンを設定。</p>
          </div>
          <div className="hs-auth-card">
            <h4>③ Claude Skillをインストール</h4>
            <p>GitHubの <code>skill/</code> フォルダをzipにしてClaude.ai → Settings → Skills → Upload。初回会話でKnowledge Storeが自動構築されます。</p>
          </div>
        </div>
      </section>


      <div className="hs-divider" />
      <section className="hs-section">
        <div className="hs-section__label"><Sprocket size={14} /> FIRST SESSION</div>
        <h2 className="hs-section__title">初回オンボーディング</h2>
        <p className="hs-section__desc">セットアップ完了後、最初の会話でAIが自動的にあなたのHubSpotを学習します。</p>
        <div style={{ maxWidth: 640, margin: "0 auto" }}>
          <div style={{ display: "grid", gap: 2 }}>
            <div className="hs-auth-card" style={{ borderLeft: "3px solid var(--hs-orange)", borderRadius: "8px 8px 0 0" }}>
              <h4 style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ background: "var(--hs-orange)", color: "white", width: 24, height: 24, borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>1</span>
                AIが自動分析を開始
              </h4>
              <p style={{ marginLeft: 32 }}>「セミナーやるからよろしく」等の最初の指示で、AIがKnowledge Storeが空であることを検知。<code>hubspot_knowledge_build</code> を自動実行し、あなたのHubSpotの全設定（プロパティ・ワークフロー・パイプライン・フォーム・リスト・メール等）を一括スキャンします。</p>
            </div>
            <div className="hs-auth-card" style={{ borderLeft: "3px solid #4A90D9", borderRadius: 0 }}>
              <h4 style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ background: "#4A90D9", color: "white", width: 24, height: 24, borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>2</span>
                10カテゴリの下書きを自動生成
              </h4>
              <p style={{ marginLeft: 32 }}>スキャン結果から、設計判断・命名規則・プロパティ注釈・ワークフロー注釈・施策パターン・禁止事項・セグメント戦略等の10カテゴリに自動分類して下書きを作成。HubSpot内のCRMノートに保存されます。</p>
            </div>
            <div className="hs-auth-card" style={{ borderLeft: "3px solid #8B5CF6", borderRadius: 0 }}>
              <h4 style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ background: "#8B5CF6", color: "white", width: 24, height: 24, borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>3</span>
                AIからあなたへ質問
              </h4>
              <p style={{ marginLeft: 32 }}>AIだけでは判断できない設計意図について質問リストが提示されます。例：</p>
              <ul style={{ marginLeft: 32, fontSize: 13, color: "var(--hs-text-light)", lineHeight: 1.8 }}>
                <li>「取引パイプラインが1本ですが、意図的にシンプルにしている理由は？」</li>
                <li>「チケットが未使用ですが、問い合わせ管理はどうしていますか？」</li>
                <li>「メール件名にルールはありますか？」</li>
                <li>「このワークフローは標準テンプレート？触っていい？」</li>
              </ul>
            </div>
            <div className="hs-auth-card" style={{ borderLeft: "3px solid #10B981", borderRadius: 0 }}>
              <h4 style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ background: "#10B981", color: "white", width: 24, height: 24, borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>4</span>
                あなたが回答 → Knowledge完成
              </h4>
              <p style={{ marginLeft: 32 }}>回答をもとにAIがKnowledge Storeを補完。「なぜそうなっているか」「何を触ってはいけないか」が記録されます。口頭で伝えるだけで、AIが整形して保存します。</p>
            </div>
            <div className="hs-auth-card" style={{ borderLeft: "3px solid var(--hs-orange)", borderRadius: "0 0 8px 8px" }}>
              <h4 style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ background: "var(--hs-orange)", color: "white", width: 24, height: 24, borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>5</span>
                MA担当者として稼働開始
              </h4>
              <p style={{ marginLeft: 32 }}>以降の会話では、AIが毎回Knowledge Storeを読み込み、あなたの会社のやり方に従って施策を提案・実行します。施策を実行するたびにhistoryが蓄積され、<strong>使うほど賢くなります</strong>。</p>
            </div>
          </div>
        </div>
      </section>

      <div className="hs-divider" />
      <section id="auth" className="hs-section">
        <div className="hs-section__label"><Sprocket size={14} /> AUTH MODES</div>
        <h2 className="hs-section__title">認証モード</h2>
        <p className="hs-section__desc">環境変数 <code>AUTH_MODE</code> で認証方式を切り替え。公開サーバーと組織専用サーバーに対応。</p>
        <div className="hs-auth-grid">
          <div className="hs-auth-card">
            <span className="hs-auth-card__badge hs-auth-card__badge--rec">① hubspot_token</span>
            <h4>HubSpot トークン直接渡し</h4>
            <p>各ユーザーが <code>Authorization: Bearer &lt;HubSpot PAT&gt;</code> で自分のトークンを渡す。MCPサーバー自体への認証はなし。公開サーバー・個人利用向け。</p>
          </div>
          <div className="hs-auth-card">
            <span className="hs-auth-card__badge hs-auth-card__badge--alt">② api_key</span>
            <h4>APIキーでゲート</h4>
            <p><code>MCP_API_KEY</code> でサーバーアクセスを制限。HubSpot トークンは環境変数に固定。<strong>デプロイした組織だけ</strong>が使えるセキュアな構成。</p>
          </div>
        </div>

        <div style={{ marginTop: 40 }}>
          <h3 style={{ fontSize: 20, fontWeight: 700, color: "var(--hs-obsidian)", marginBottom: 16 }}>HubSpot Private App トークンの発行方法</h3>
          <ol style={{ fontSize: 14, lineHeight: 2, color: "var(--hs-text)", paddingLeft: 20 }}>
            <li><a href="https://app.hubspot.com/" target="_blank" rel="noopener noreferrer" style={{ color: "var(--hs-orange)" }}>HubSpot</a> にログイン → 右上の ⚙️ 設定アイコン</li>
            <li>左メニュー「Integrations」→「Private Apps」</li>
            <li>「Create a private app」をクリック</li>
            <li>Basic Info: アプリ名（例: MCP Server）を入力</li>
            <li>「Scopes」タブで下記の権限にチェック</li>
            <li>「Create app」→ 表示される Access Token（<code>pat-na1-xxxx...</code>）をコピー</li>
          </ol>
        </div>

        <div style={{ marginTop: 28 }}>
          <h4 style={{ fontSize: 16, fontWeight: 700, color: "var(--hs-obsidian)", marginBottom: 12 }}>必要なスコープ（権限）</h4>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse", border: "1px solid var(--hs-border)", borderRadius: "var(--hs-radius)" }}>
              <thead>
                <tr style={{ background: "var(--hs-bg)", borderBottom: "2px solid var(--hs-border)" }}>
                  <th style={{ padding: "10px 14px", textAlign: "left", color: "var(--hs-text-light)", fontWeight: 700 }}>スコープ</th>
                  <th style={{ padding: "10px 14px", textAlign: "left", color: "var(--hs-text-light)", fontWeight: 700 }}>対象ツール</th>
                  <th style={{ padding: "10px 14px", textAlign: "center", color: "var(--hs-text-light)", fontWeight: 700, width: 60 }}>必須</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { scope: "crm.objects.contacts.read / .write", tools: "contact_*", req: true },
                  { scope: "crm.objects.companies.read / .write", tools: "company_*", req: true },
                  { scope: "crm.objects.deals.read / .write", tools: "deal_*", req: true },
                  { scope: "crm.objects.line_items.read / .write", tools: "lineitem_*", req: true },
                  { scope: "e-commerce (products)", tools: "product_*", req: true },
                  { scope: "tickets", tools: "ticket_*", req: true },
                  { scope: "crm.schemas.*.read / .write", tools: "property_*, pipeline_*", req: true },
                  { scope: "automation", tools: "workflow_*", req: true },
                  { scope: "content", tools: "cms_blog_*, cms_page_*", req: false },
                ].map((r, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid var(--hs-border)" }}>
                    <td style={{ padding: "8px 14px", fontFamily: "'SF Mono','Fira Code',monospace", fontSize: 12 }}>{r.scope}</td>
                    <td style={{ padding: "8px 14px", color: "var(--hs-text-light)" }}>{r.tools}</td>
                    <td style={{ padding: "8px 14px", textAlign: "center" }}>
                      {r.req
                        ? <span style={{ color: "#E8603C", fontWeight: 700 }}>✓</span>
                        : <span style={{ color: "var(--hs-text-light)" }}>任意</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ fontSize: 12, color: "var(--hs-text-light)", marginTop: 8 }}>※ CMS スコープは CMS Hub 契約がある場合のみ利用可能です。不要な場合はチェック不要です。</p>
        </div>
      </section>

      <div className="hs-divider" />
      <section id="setup" className="hs-section">
        <div className="hs-section__label"><Sprocket size={14} /> QUICK SETUP</div>
        <h2 className="hs-section__title">クイック接続</h2>
        <p className="hs-section__desc">お使いのAIクライアントを選択して、設定をコピーするだけ。トークンはHubSpot Private Appで発行してください。</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {CLIENTS.map((c) => <ClientRow key={c.id} c={c} />)}
        </div>
      </section>

      <div className="hs-divider" />
      <section id="tools" className="hs-section">
        <div className="hs-section__label"><Sprocket size={14} /> 116 TOOLS</div>
        <h2 className="hs-section__title">API操作ツール + Knowledge Store <span style={{ fontSize: 16, fontWeight: 500, color: "var(--hs-text-light)" }}>— {totalTools} tools</span></h2>
        <p className="hs-section__desc">各ツールをクリックすると、APIエンドポイントとパラメータの詳細が表示されます。</p>
        <div className="hs-category-grid">
          {TOOL_CATEGORIES.map((cat) => (
            <CategoryCard key={cat.category} cat={cat} />
          ))}
        </div>
      </section>

      <div className="hs-divider" />
      <section id="specs" className="hs-section">
        <div className="hs-section__label"><Sprocket size={14} /> TECH SPECS</div>
        <h2 className="hs-section__title">技術仕様</h2>
        <div className="hs-specs">
          {[{l:"Framework",v:"Next.js 15"},{l:"Transport",v:"Streamable HTTP"},{l:"Protocol",v:"MCP 2025-03-26"},{l:"Auth",v:"2 Modes"},{l:"API",v:"CRM v3 + Associations v4 + CMS v3 + Automation v4"},{l:"Hosting",v:"Vercel"}].map((s) => (
            <div key={s.l} className="hs-spec"><div className="hs-spec__label">{s.l}</div><div className="hs-spec__value">{s.v}</div></div>
          ))}
        </div>
        <div className="hs-cta-banner">
          <h3>組織専用サーバーをデプロイしよう</h3>
          <p>ワンクリックで自分専用のMCPサーバーをVercelにデプロイ。認証モードとトークンを設定するだけ。</p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <a href="https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FDaisukeHori%2Fhubspot-ma-mcp&env=AUTH_MODE%2CHUBSPOT_ACCESS_TOKEN%2CMCP_API_KEY&envDescription=AUTH_MODE%3A+hubspot_token%28%E3%83%87%E3%83%95%E3%82%A9%E3%83%AB%E3%83%88%29+or+api_key+%7C+HUBSPOT_ACCESS_TOKEN%3A+api_key%E3%83%A2%E3%83%BC%E3%83%89%E6%99%82%E3%81%AB%E5%BF%85%E9%A0%88+%7C+MCP_API_KEY%3A+api_key%E3%83%A2%E3%83%BC%E3%83%89%E6%99%82%E3%81%AB%E5%BF%85%E9%A0%88&envLink=https%3A%2F%2Fgithub.com%2FDaisukeHori%2Fhubspot-ma-mcp%23%E8%AA%8D%E8%A8%BC%E3%83%A2%E3%83%BC%E3%83%89&project-name=hubspot-ma-mcp&repository-name=hubspot-ma-mcp" target="_blank" rel="noopener noreferrer" className="hs-btn hs-btn--primary" style={{ fontSize: 15, padding: "12px 28px" }}>▲ Deploy with Vercel</a>
            <a href="https://github.com/DaisukeHori/hubspot-ma-mcp" target="_blank" rel="noopener noreferrer" className="hs-btn" style={{ fontSize: 15, padding: "12px 28px", background: "rgba(255,255,255,0.1)", color: "white", border: "1px solid rgba(255,255,255,0.2)" }}>GitHub →</a>
          </div>
        </div>
      </section>

      <footer className="hs-footer">
        <a href="https://github.com/DaisukeHori/hubspot-ma-mcp" target="_blank" rel="noopener noreferrer">GitHub</a>
        {" · "}<a href="https://revol.co.jp" target="_blank" rel="noopener noreferrer">Revol Co., Ltd.</a>{" · "}MIT License
      </footer>
    </>
  );
}
