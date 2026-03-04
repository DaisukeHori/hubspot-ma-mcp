/**
 * 環境変数の管理
 *
 * HUBSPOT_ACCESS_TOKEN はオプション。
 * Bearer Token がリクエストヘッダーで渡される場合は不要。
 */

export function getConfig() {
  return {
    hubspotAccessToken: process.env.HUBSPOT_ACCESS_TOKEN || undefined,
    mcpApiKey: process.env.MCP_API_KEY || undefined,
    hubspotBaseUrl: "https://api.hubapi.com",
  };
}
