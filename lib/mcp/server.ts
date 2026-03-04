/**
 * MCP サーバー初期化
 * 全ツールを一括登録する
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerWorkflowList } from "./tools/workflow-list";
import { registerWorkflowGet } from "./tools/workflow-get";
import { registerWorkflowCreate } from "./tools/workflow-create";
import { registerWorkflowUpdate } from "./tools/workflow-update";
import { registerWorkflowDelete } from "./tools/workflow-delete";
import { registerWorkflowBatchRead } from "./tools/workflow-batch-read";

/**
 * MCP サーバーに全ツールを登録する
 */
export function registerAllTools(server: McpServer) {
  registerWorkflowList(server);
  registerWorkflowGet(server);
  registerWorkflowCreate(server);
  registerWorkflowUpdate(server);
  registerWorkflowDelete(server);
  registerWorkflowBatchRead(server);
}
