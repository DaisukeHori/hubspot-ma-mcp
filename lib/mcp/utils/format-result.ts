/**
 * formatToolResult — ツールの応答 JSON を整形するための共通ヘルパー。
 *
 * 各ツールに `pretty` パラメータを追加することで、人間可読（インデント整形）と
 * minified（サイズ最小）を呼び出し側が選択できるようにする。
 *
 * 【背景】
 * Claude.ai (web/desktop) の MCP 接続層は ~50KB 超のレスポンスで
 * intermittently "Tool result could not be submitted" エラーを起こす既知のバグがある
 * (anthropics/claude-ai-mcp Issue #211)。
 * インデント整形（JSON.stringify(result, null, 2)）は実サイズの 20〜40% を
 * 改行・スペースで占めるため、大きいレスポンスでは pretty=false で
 * サイズを抑えると閾値を回避しやすい。
 *
 * 【デフォルト方針】
 * pretty が未指定または true の場合はインデント整形（従来挙動を維持）。
 * pretty=false を明示的に指定したときだけ minified にする。
 * これにより既存の呼び出しコードは挙動変わらず、必要なときだけ
 * サイズ最適化を opt-in できる。
 */

import { z } from "zod";

/**
 * 全ツール共通の `pretty` パラメータの説明文。
 * Zod スキーマで `pretty: z.boolean().optional().describe(prettyDescription)` の形で利用。
 */
export const prettyDescription =
  "JSON出力の整形オプション（デフォルト true=インデント整形、人間可読を優先）。" +
  "true: 2スペースインデントで人間が読みやすい形式（JSON.stringify(result, null, 2)）。" +
  "false: minified形式（インデント・改行なし、サイズ20-40%削減）。" +
  "大きなレスポンス（~50KB+）でClaude.aiの'Tool result could not be submitted'エラーが出る場合は false を指定すると改善する場合あり。" +
  "anthropics/claude-ai-mcp Issue #211 を参照。";

/**
 * ツール応答用の JSON 文字列化ヘルパー。
 *
 * @param result 任意の JSON シリアライズ可能な値
 * @param pretty 未指定 or true なら 2スペースインデント、false なら minified
 * @returns JSON 文字列
 */
export function formatToolResult(result: unknown, pretty?: boolean): string {
  // pretty が未指定 or true の場合は整形（従来挙動を維持）。
  // pretty=false を明示的に指定したときだけ minified にする。
  return pretty === false ? JSON.stringify(result) : JSON.stringify(result, null, 2);
}

/**
 * Zod スキーマで再利用するための pretty パラメータ定義。
 *
 * 【MCP クライアントの boolean 取り扱いに対する対策】
 * Claude.ai / Cursor 等の MCP クライアントは、ツール呼び出し時に boolean 型の
 * パラメータを文字列 ("true" / "false") として送信することがある
 * (LLM の `<parameter name="pretty">false</parameter>` 形式の出力を文字列として
 * シリアライズするケース)。
 *
 * 素の z.boolean() では文字列を拒否してエラーになるため、z.preprocess() で
 * "true" / "false" 文字列を boolean に変換してから検証する。
 *
 * 【z.coerce.boolean() を使わない理由】
 * z.coerce.boolean() は JavaScript の Boolean(value) を使うため、
 * Boolean("false") === true となり、文字列 "false" が true に化ける。
 * これは Zod 公式が「Note — Boolean coercion ... may not work how you expect」と
 * 明記しているハマりどころ。
 *
 * 利用例:
 * ```ts
 * import { prettyParam, formatToolResult } from "@/lib/mcp/utils/format-result";
 *
 * server.tool(
 *   "my_tool",
 *   "...",
 *   {
 *     someParam: z.string(),
 *     pretty: prettyParam,
 *   },
 *   async ({ someParam, pretty }) => {
 *     const result = await fetchSomething();
 *     return { content: [{ type: "text" as const, text: formatToolResult(result, pretty) }] };
 *   }
 * );
 * ```
 */
export const prettyParam = z
  .preprocess((val) => {
    // 文字列 "true" / "false" を boolean に変換
    // 大文字小文字も許容（"True" / "False" / "TRUE" / "FALSE"）
    if (typeof val === "string") {
      const lower = val.toLowerCase();
      if (lower === "true") return true;
      if (lower === "false") return false;
    }
    return val;
  }, z.boolean().optional())
  .describe(prettyDescription);
