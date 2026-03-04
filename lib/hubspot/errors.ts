/**
 * HubSpot API エラーハンドリング
 */

export class HubSpotError extends Error {
  public readonly status: number;
  public readonly hubspotMessage: string;
  public readonly correlationId?: string;

  constructor(status: number, message: string, correlationId?: string) {
    super(`HubSpot API Error (${status}): ${message}`);
    this.name = "HubSpotError";
    this.status = status;
    this.hubspotMessage = message;
    this.correlationId = correlationId;
  }

  /**
   * ユーザー向けの分かりやすいエラーメッセージを返す
   */
  toUserMessage(): string {
    switch (this.status) {
      case 401:
        return (
          "HubSpot API トークンが無効です。" +
          "Private App のトークンを再確認してください。"
        );
      case 403:
        return (
          "HubSpot API のスコープが不足しています。" +
          "Private App に `automation` スコープが付与されているか確認してください。"
        );
      case 404:
        return (
          "指定されたリソースが見つかりません。" +
          "ワークフローIDを確認してください。"
        );
      case 429:
        return (
          "HubSpot API のレート制限に達しました。" +
          "しばらく待ってから再試行してください。"
        );
      default:
        if (this.status >= 500) {
          return (
            "HubSpot 側でエラーが発生しました。" +
            "しばらく待ってから再試行してください。" +
            (this.correlationId
              ? ` (correlationId: ${this.correlationId})`
              : "")
          );
        }
        return `HubSpot API エラー: ${this.hubspotMessage}`;
    }
  }
}
