/**
 * MCP サーバー初期化
 * 全ツールを一括登録する（59 tools）
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
import { registerContactDelete } from "./tools/contact-delete";

// ── CRM Companies ──
import { registerCompanySearch } from "./tools/company-search";
import { registerCompanyGet } from "./tools/company-get";
import { registerCompanyCreate } from "./tools/company-create";
import { registerCompanyUpdate } from "./tools/company-update";
import { registerCompanyDelete } from "./tools/company-delete";

// ── CRM Deals ──
import { registerDealSearch } from "./tools/deal-search";
import { registerDealGet } from "./tools/deal-get";
import { registerDealCreate } from "./tools/deal-create";
import { registerDealUpdate } from "./tools/deal-update";
import { registerDealDelete } from "./tools/deal-delete";

// ── CRM Tickets ──
import { registerTicketSearch } from "./tools/ticket-search";
import { registerTicketGet } from "./tools/ticket-get";
import { registerTicketCreate } from "./tools/ticket-create";
import { registerTicketUpdate } from "./tools/ticket-update";
import { registerTicketDelete } from "./tools/ticket-delete";

// ── Properties（CRUD）──
import { registerPropertiesList } from "./tools/properties-list";
import { registerPropertyCreate } from "./tools/property-create";
import { registerPropertyUpdate } from "./tools/property-update";
import { registerPropertyDelete } from "./tools/property-delete";

// ── Pipelines（CRUD）──
import { registerPipelineList } from "./tools/pipeline-list";
import { registerPipelineCreate } from "./tools/pipeline-create";
import { registerPipelineUpdate } from "./tools/pipeline-update";

// ── Line Items ──
import { registerLineItemSearch } from "./tools/lineitem-search";
import { registerLineItemGet } from "./tools/lineitem-get";
import { registerLineItemCreate } from "./tools/lineitem-create";
import { registerLineItemUpdate } from "./tools/lineitem-update";
import { registerLineItemDelete } from "./tools/lineitem-delete";

// ── Products ──
import { registerProductSearch } from "./tools/product-search";
import { registerProductGet } from "./tools/product-get";
import { registerProductCreate } from "./tools/product-create";
import { registerProductUpdate } from "./tools/product-update";
import { registerProductDelete } from "./tools/product-delete";

// ── Notes（Engagements）──
import { registerNoteSearch } from "./tools/note-search";
import { registerNoteGet } from "./tools/note-get";
import { registerNoteCreate } from "./tools/note-create";
import { registerNoteUpdate } from "./tools/note-update";

// ── Tasks（Engagements）──
import { registerTaskSearch } from "./tools/task-search";
import { registerTaskGet } from "./tools/task-get";
import { registerTaskCreate } from "./tools/task-create";
import { registerTaskUpdate } from "./tools/task-update";

// ── Associations ──
import { registerAssociationList } from "./tools/association-list";
import { registerAssociationCreate } from "./tools/association-create";
import { registerAssociationDelete } from "./tools/association-delete";
import { registerAssociationLabels } from "./tools/association-labels";

// ── CMS（Blog & Pages）──
import { registerCmsBlogList } from "./tools/cms-blog-list";
import { registerCmsBlogUpdate } from "./tools/cms-blog-update";
import { registerCmsPageList } from "./tools/cms-page-list";
import { registerCmsPageUpdate } from "./tools/cms-page-update";

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

  // CRM Contacts（5 tools）
  registerContactSearch(server);
  registerContactGet(server);
  registerContactCreate(server);
  registerContactUpdate(server);
  registerContactDelete(server);

  // CRM Companies（5 tools）
  registerCompanySearch(server);
  registerCompanyGet(server);
  registerCompanyCreate(server);
  registerCompanyUpdate(server);
  registerCompanyDelete(server);

  // CRM Deals（5 tools）
  registerDealSearch(server);
  registerDealGet(server);
  registerDealCreate(server);
  registerDealUpdate(server);
  registerDealDelete(server);

  // CRM Tickets（5 tools）
  registerTicketSearch(server);
  registerTicketGet(server);
  registerTicketCreate(server);
  registerTicketUpdate(server);
  registerTicketDelete(server);

  // Properties（4 tools）
  registerPropertiesList(server);
  registerPropertyCreate(server);
  registerPropertyUpdate(server);
  registerPropertyDelete(server);

  // Pipelines（3 tools）
  registerPipelineList(server);
  registerPipelineCreate(server);
  registerPipelineUpdate(server);

  // Line Items（5 tools）
  registerLineItemSearch(server);
  registerLineItemGet(server);
  registerLineItemCreate(server);
  registerLineItemUpdate(server);
  registerLineItemDelete(server);

  // Products（5 tools）
  registerProductSearch(server);
  registerProductGet(server);
  registerProductCreate(server);
  registerProductUpdate(server);
  registerProductDelete(server);

  // Notes（4 tools）
  registerNoteSearch(server);
  registerNoteGet(server);
  registerNoteCreate(server);
  registerNoteUpdate(server);

  // Tasks（4 tools）
  registerTaskSearch(server);
  registerTaskGet(server);
  registerTaskCreate(server);
  registerTaskUpdate(server);

  // Associations（4 tools）
  registerAssociationList(server);
  registerAssociationCreate(server);
  registerAssociationDelete(server);
  registerAssociationLabels(server);

  // CMS（4 tools）
  registerCmsBlogList(server);
  registerCmsBlogUpdate(server);
  registerCmsPageList(server);
  registerCmsPageUpdate(server);
}

