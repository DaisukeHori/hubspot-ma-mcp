/**
 * MCP サーバー初期化
 * 全ツールを一括登録する
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

// ── Workflow（Automation v4）──
import { registerWorkflowList } from "./tools/workflow-list";
import { registerWorkflowGet } from "./tools/workflow-get";
import { registerWorkflowCreate } from "./tools/workflow-create";
import { registerWorkflowUpdate } from "./tools/workflow-update";
import { registerWorkflowDelete } from "./tools/workflow-delete";
import { registerWorkflowBatchRead } from "./tools/workflow-batch-read";

// ── CRM Contacts ──
import { registerContactSearch } from "./tools/contact-search";
import { registerContactGet } from "./tools/contact-get";
import { registerContactCreate } from "./tools/contact-create";
import { registerContactUpdate } from "./tools/contact-update";

// ── CRM Companies ──
import { registerCompanySearch } from "./tools/company-search";
import { registerCompanyGet } from "./tools/company-get";
import { registerCompanyCreate } from "./tools/company-create";

// ── CRM Deals ──
import { registerDealSearch } from "./tools/deal-search";
import { registerDealGet } from "./tools/deal-get";
import { registerDealCreate } from "./tools/deal-create";
import { registerDealUpdate } from "./tools/deal-update";

// ── CRM Tickets ──
import { registerTicketSearch } from "./tools/ticket-search";
import { registerTicketCreate } from "./tools/ticket-create";

// ── Pipelines & Properties ──
import { registerPipelineList } from "./tools/pipeline-list";
import { registerPropertiesList } from "./tools/properties-list";

/**
 * MCP サーバーに全ツールを登録する
 */
export function registerAllTools(server: McpServer) {
  // Workflow（6 tools）
  registerWorkflowList(server);
  registerWorkflowGet(server);
  registerWorkflowCreate(server);
  registerWorkflowUpdate(server);
  registerWorkflowDelete(server);
  registerWorkflowBatchRead(server);

  // CRM Contacts（4 tools）
  registerContactSearch(server);
  registerContactGet(server);
  registerContactCreate(server);
  registerContactUpdate(server);

  // CRM Companies（3 tools）
  registerCompanySearch(server);
  registerCompanyGet(server);
  registerCompanyCreate(server);

  // CRM Deals（4 tools）
  registerDealSearch(server);
  registerDealGet(server);
  registerDealCreate(server);
  registerDealUpdate(server);

  // CRM Tickets（2 tools）
  registerTicketSearch(server);
  registerTicketCreate(server);

  // Pipelines & Properties（2 tools）
  registerPipelineList(server);
  registerPropertiesList(server);
}
