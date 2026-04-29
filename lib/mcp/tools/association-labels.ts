import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { listAssociationLabels, createAssociationLabel, updateAssociationLabel, deleteAssociationLabel } from "@/lib/hubspot/crm-client";
import { HubSpotError } from "@/lib/hubspot/errors";
import { formatToolResult, prettyParam } from "@/lib/mcp/utils/format-result";

export function registerAssociationLabels(server: McpServer) {
  server.tool(
    "association_labels",
    `HubSpot の関連付けラベル定義を管理する（CRUD）。

【list】2オブジェクト間で利用可能な全ラベル一覧を取得。各ラベルの typeId, category, label名が返る。方向ごとに異なるtypeIdを持つ（例: contact→company と company→contact で別ID）。

【create】カスタムラベルを新規作成。
  - 単一ラベル: labelのみ指定（例: "Partner"）。両方向に同じラベル名が適用される。
  - ペアラベル: label + inverseLabel を指定。方向ごとに異なるラベル名（例: from側="代理店", to側="直送先"、from側="Parent Company", to側="Child Company"）。ペアラベルはそれぞれ異なるtypeIdが自動付与される。

【update】既存ラベルの名前を変更。associationTypeId（listで取得）を指定。

【delete】カスタムラベル定義を削除。associationTypeId を指定。削除前にそのラベルを使用しているレコードから外す必要がある場合あり。`,
    {
      fromObjectType: z.string().describe("元オブジェクトタイプ（contacts, companies, deals, tickets 等）"),
      toObjectType: z.string().describe("関連先オブジェクトタイプ: contacts, companies, deals, tickets, notes, tasks, line_items, products, 又はカスタムオブジェクトID"),
      action: z.enum(["list", "create", "update", "delete"]).describe("list: 一覧 / create: 作成 / update: 名前変更 / delete: 定義削除"),
      label: z.string().optional().describe("ラベル名。create/update時に必須。create時はfrom→to方向のラベル（例: '代理店'）"),
      name: z.string().optional().describe("内部名（create時に必須。英数字snake_case。例: 'distributor'）"),
      inverseLabel: z.string().optional().describe("ペアラベル作成時のみ。to→from方向のラベル名（例: '直送先'）。省略すると両方向同じラベル名になる"),
      associationTypeId: z.number().optional().describe("update/delete時に必須。対象ラベルのtypeId（listで取得）"),
    
      pretty: prettyParam,
},
    async ({ fromObjectType, toObjectType, action, label, name, inverseLabel, associationTypeId, pretty }) => {
      try {
        switch (action) {
          case "list": {
            const result = await listAssociationLabels(fromObjectType, toObjectType);
            return {
              content: [{
                type: "text" as const,
                text: formatToolResult({
                  description: `${fromObjectType} → ${toObjectType} の関連ラベル定義`,
                  note: "方向が逆（to→from）のラベルは fromObjectType と toObjectType を入れ替えて再取得してください",
                  total: result.results.length,
                  labels: result.results,
                }, pretty),
              }],
            };
          }
          case "create": {
            if (!label || !name) {
              return { content: [{ type: "text" as const, text: "エラー: create には label と name が必須です。\nペアラベル作成時は inverseLabel も指定してください（例: label='代理店', inverseLabel='直送先'）" }], isError: true };
            }
            const result = await createAssociationLabel(fromObjectType, toObjectType, label, name, inverseLabel);
            return {
              content: [{
                type: "text" as const,
                text: formatToolResult({
                  description: inverseLabel
                    ? `ペアラベル作成完了: ${fromObjectType}→${toObjectType}="${label}", ${toObjectType}→${fromObjectType}="${inverseLabel}"`
                    : `単一ラベル作成完了: "${label}"`,
                  results: result.results,
                }, pretty),
              }],
            };
          }
          case "update": {
            if (!label || associationTypeId === undefined) {
              return { content: [{ type: "text" as const, text: "エラー: update には label と associationTypeId が必須です。" }], isError: true };
            }
            const result = await updateAssociationLabel(fromObjectType, toObjectType, associationTypeId, label, inverseLabel);
            return { content: [{ type: "text" as const, text: formatToolResult(result, pretty) }] };
          }
          case "delete": {
            if (associationTypeId === undefined) {
              return { content: [{ type: "text" as const, text: "エラー: delete には associationTypeId が必須です（listで取得）。" }], isError: true };
            }
            await deleteAssociationLabel(fromObjectType, toObjectType, associationTypeId);
            return { content: [{ type: "text" as const, text: `ラベル定義 typeId=${associationTypeId} を削除しました。` }] };
          }
        }
      } catch (error) {
        const message = error instanceof HubSpotError ? `HubSpot API エラー (${error.status}): ${error.message}` : String(error);
        return { content: [{ type: "text" as const, text: message }], isError: true };
      }
    }
  );
}
