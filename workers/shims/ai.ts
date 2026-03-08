/**
 * Shim for the "ai" (Vercel AI SDK) package.
 *
 * agents パッケージが getAITools() 内で dynamic import("ai") するが、
 * このプロジェクトでは使用しないためダミーを提供する。
 */
export function jsonSchema() {
  throw new Error("ai package is not available in this environment");
}
