/**
 * MCP サーバー初期化
 * 全ツールを一括登録する（35 tools）
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
import { registerLineItemCreate } from "./tools/lineitem-create";
import { registerLineItemUpdate } from "./tools/lineitem-update";

// ── Products ──
import { registerProductSearch } from "./tools/product-search";
import { registerProductCreate } from "./tools/product-create";

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

  // Properties（4 tools）
  registerPropertiesList(server);
  registerPropertyCreate(server);
  registerPropertyUpdate(server);
  registerPropertyDelete(server);

  // Pipelines（3 tools）
  registerPipelineList(server);
  registerPipelineCreate(server);
  registerPipelineUpdate(server);

  // Line Items（3 tools）
  registerLineItemSearch(server);
  registerLineItemCreate(server);
  registerLineItemUpdate(server);

  // Products（2 tools）
  registerProductSearch(server);
  registerProductCreate(server);

  // CMS（4 tools）
  registerCmsBlogList(server);
  registerCmsBlogUpdate(server);
  registerCmsPageList(server);
  registerCmsPageUpdate(server);
}
