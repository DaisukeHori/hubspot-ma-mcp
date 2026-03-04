import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { crmUpdate } from "../../hubspot/crm-client";

export function registerLineItemUpdate(server: McpServer) {
  server.tool(
    "lineitem_update",
    `HubSpot 明細行のプロパティを更新する。指定したプロパティのみ上書き。プロパティ名はproperties_listツールで確認可能。`,
    {
      lineItemId: z.string().describe("Line Item ID"),
      properties: z.record(z.string()).describe("更新するプロパティ（キー:値）"),
    },
    async ({ lineItemId, properties }) => {
      const result = await crmUpdate("line_items", lineItemId, properties);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );
}
