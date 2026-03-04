export default function Home() {
  return (
    <main
      style={{
        maxWidth: 600,
        margin: "80px auto",
        fontFamily: "system-ui, sans-serif",
        padding: "0 20px",
      }}
    >
      <h1 style={{ fontSize: 24, marginBottom: 8 }}>
        HubSpot MA MCP Server
      </h1>
      <p style={{ color: "#666", marginBottom: 32 }}>
        HubSpot Marketing Automation を Claude から操作するための MCP サーバー
      </p>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 18, marginBottom: 8 }}>接続情報</h2>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: 14,
          }}
        >
          <tbody>
            <tr>
              <td style={{ padding: "8px 0", fontWeight: 600 }}>
                MCP エンドポイント
              </td>
              <td style={{ padding: "8px 0" }}>
                <code>/api/mcp</code>
              </td>
            </tr>
            <tr>
              <td style={{ padding: "8px 0", fontWeight: 600 }}>
                トランスポート
              </td>
              <td style={{ padding: "8px 0" }}>Streamable HTTP</td>
            </tr>
            <tr>
              <td style={{ padding: "8px 0", fontWeight: 600 }}>
                プロトコル
              </td>
              <td style={{ padding: "8px 0" }}>MCP 2025-03-26</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section>
        <h2 style={{ fontSize: 18, marginBottom: 8 }}>利用可能なツール</h2>
        <ul style={{ lineHeight: 1.8, fontSize: 14 }}>
          <li>
            <strong>workflow_list</strong> — ワークフロー一覧取得
          </li>
          <li>
            <strong>workflow_get</strong> — ワークフロー詳細取得
          </li>
          <li>
            <strong>workflow_create</strong> — ワークフロー作成
          </li>
          <li>
            <strong>workflow_update</strong> — ワークフロー更新
          </li>
          <li>
            <strong>workflow_delete</strong> — ワークフロー削除
          </li>
          <li>
            <strong>workflow_batch_read</strong> — ワークフロー一括取得
          </li>
        </ul>
      </section>
    </main>
  );
}
