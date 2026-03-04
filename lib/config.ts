/**
 * 環境変数の管理・バリデーション
 */

export function getConfig() {
  const hubspotAccessToken = process.env.HUBSPOT_ACCESS_TOKEN;
  const mcpApiKey = process.env.MCP_API_KEY;

  if (!hubspotAccessToken) {
    throw new Error(
      "HUBSPOT_ACCESS_TOKEN が設定されていません。" +
        "HubSpot > Settings > Integrations > Private Apps で取得してください。"
    );
  }

  return {
    hubspotAccessToken,
    mcpApiKey: mcpApiKey || undefined,
    hubspotBaseUrl: "https://api.hubapi.com",
  };
}
