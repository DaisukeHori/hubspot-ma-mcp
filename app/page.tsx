"use client";

import { useState } from "react";

const MCP_URL = "https://hubspot-ma-mcp.vercel.app/api/mcp";

type ClientId =
  | "claude-web"
  | "claude-desktop"
  | "claude-code"
  | "cursor"
  | "vscode"
  | "windsurf"
  | "api";

interface ClientConfig {
  id: ClientId;
  name: string;
  icon: string;
  color: string;
  description: string;
  oneClick?: string;
  copyContent: string;
  copyLabel: string;
  instructions: string[];
}

const CLIENTS: ClientConfig[] = [
  {
    id: "claude-web",
    name: "Claude.ai",
    icon: "◈",
    color: "#D97706",
    description: "Web ブラウザ版（Pro / Max / Team / Enterprise）",
    copyContent: MCP_URL,
    copyLabel: "URL をコピー",
    instructions: [
      '設定 → コネクタ → 「カスタムコネクタを追加」',
      "上記 URL を貼り付けて「追加」をクリック",
    ],
  },
  {
    id: "claude-desktop",
    name: "Claude Desktop",
    icon: "◇",
    color: "#D97706",
    description: "デスクトップアプリ（macOS / Windows）",
    copyContent: JSON.stringify(
      {
        mcpServers: {
          "hubspot-ma": {
            command: "npx",
            args: ["mcp-remote", MCP_URL],
          },
        },
      },
      null,
      2
    ),
    copyLabel: "JSON をコピー",
    instructions: [
      "macOS: ~/Library/Application Support/Claude/claude_desktop_config.json",
      "Windows: %APPDATA%\\Claude\\claude_desktop_config.json",
      "上記 JSON を貼り付けてアプリを再起動",
    ],
  },
  {
    id: "claude-code",
    name: "Claude Code",
    icon: "⌘",
    color: "#D97706",
    description: "ターミナル CLI",
    oneClick: `claude mcp add --transport http hubspot-ma ${MCP_URL}`,
    copyContent: `claude mcp add --transport http hubspot-ma ${MCP_URL}`,
    copyLabel: "コマンドをコピー",
    instructions: ["ターミナルで上記コマンドを実行するだけ"],
  },
  {
    id: "cursor",
    name: "Cursor",
    icon: "⟐",
    color: "#00A0FF",
    description: "AI コードエディタ",
    copyContent: JSON.stringify(
      {
        mcpServers: {
          "hubspot-ma": {
            type: "http",
            url: MCP_URL,
          },
        },
      },
      null,
      2
    ),
    copyLabel: "JSON をコピー",
    instructions: [
      "Cmd/Ctrl + , → Tools & Integrations → New MCP Server",
      "または ~/.cursor/mcp.json に上記 JSON を貼り付け",
    ],
  },
  {
    id: "vscode",
    name: "VS Code",
    icon: "⬡",
    color: "#007ACC",
    description: "Visual Studio Code（GitHub Copilot Chat）",
    oneClick: `code --add-mcp '{"type":"http","name":"hubspot-ma","url":"${MCP_URL}"}'`,
    copyContent: `code --add-mcp '{"type":"http","name":"hubspot-ma","url":"${MCP_URL}"}'`,
    copyLabel: "コマンドをコピー",
    instructions: [
      "ターミナルで上記コマンドを実行",
      "または .vscode/mcp.json に JSON 設定を追加",
    ],
  },
  {
    id: "windsurf",
    name: "Windsurf",
    icon: "◆",
    color: "#06B6D4",
    description: "AI コードエディタ",
    copyContent: JSON.stringify(
      {
        mcpServers: {
          "hubspot-ma": {
            command: "npx",
            args: ["mcp-remote", MCP_URL],
          },
        },
      },
      null,
      2
    ),
    copyLabel: "JSON をコピー",
    instructions: [
      "Cmd/Ctrl + , → Cascade → MCP servers → Add Server",
      "上記 JSON を貼り付け",
    ],
  },
  {
    id: "api",
    name: "Anthropic API",
    icon: "⬢",
    color: "#8B5CF6",
    description: "MCP Connector Beta（mcp_servers パラメータ）",
    copyContent: JSON.stringify(
      {
        mcp_servers: [
          {
            type: "url",
            url: MCP_URL,
            name: "hubspot-ma",
          },
        ],
        tools: [
          {
            type: "mcp_toolset",
            mcp_server_name: "hubspot-ma",
          },
        ],
      },
      null,
      2
    ),
    copyLabel: "JSON をコピー",
    instructions: [
      "messages API の body に上記を追加",
      'ヘッダー: "anthropic-beta": "mcp-client-2025-11-20"',
    ],
  },
];

const TOOLS = [
  { name: "workflow_list", desc: "ワークフロー一覧取得", emoji: "📋" },
  { name: "workflow_get", desc: "ワークフロー詳細取得", emoji: "🔍" },
  { name: "workflow_create", desc: "ワークフロー作成", emoji: "✨" },
  { name: "workflow_update", desc: "ワークフロー更新", emoji: "🔄" },
  { name: "workflow_delete", desc: "ワークフロー削除", emoji: "🗑️" },
  { name: "workflow_batch_read", desc: "ワークフロー一括取得", emoji: "📦" },
];

function CopyButton({ text, label, color }: { text: string; label: string; color: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      onClick={handleCopy}
      style={{
        background: copied ? "#10B981" : color,
        color: "#fff",
        border: "none",
        padding: "10px 20px",
        borderRadius: 8,
        cursor: "pointer",
        fontWeight: 700,
        fontSize: 14,
        letterSpacing: "0.02em",
        transition: "all 0.2s ease",
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
      }}
    >
      <span style={{ fontSize: 16 }}>{copied ? "✓" : "⎘"}</span>
      {copied ? "コピー完了！" : label}
    </button>
  );
}

function ClientCard({ client }: { client: ClientConfig }) {
  const [open, setOpen] = useState(false);

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 16,
        overflow: "hidden",
        transition: "all 0.3s ease",
      }}
    >
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: "100%",
          background: "transparent",
          border: "none",
          padding: "20px 24px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 16,
          color: "#E5E7EB",
          textAlign: "left",
        }}
      >
        <span
          style={{
            fontSize: 28,
            color: client.color,
            width: 40,
            textAlign: "center",
            filter: `drop-shadow(0 0 8px ${client.color}40)`,
          }}
        >
          {client.icon}
        </span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 17, letterSpacing: "-0.01em" }}>
            {client.name}
          </div>
          <div style={{ fontSize: 13, color: "#9CA3AF", marginTop: 2 }}>
            {client.description}
          </div>
        </div>
        <span
          style={{
            fontSize: 18,
            color: "#6B7280",
            transform: open ? "rotate(180deg)" : "rotate(0)",
            transition: "transform 0.3s ease",
          }}
        >
          ▾
        </span>
      </button>

      {open && (
        <div style={{ padding: "0 24px 24px", animation: "slideDown 0.3s ease" }}>
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 20 }}>
            <ol
              style={{
                margin: "0 0 16px 0",
                padding: "0 0 0 20px",
                fontSize: 14,
                color: "#D1D5DB",
                lineHeight: 1.8,
              }}
            >
              {client.instructions.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
            <pre
              style={{
                background: "rgba(0,0,0,0.4)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 10,
                padding: 16,
                overflow: "auto",
                fontSize: 12,
                lineHeight: 1.6,
                color: "#A5F3FC",
                marginBottom: 16,
                maxHeight: 240,
              }}
            >
              <code>{client.copyContent}</code>
            </pre>
            <CopyButton text={client.copyContent} label={client.copyLabel} color={client.color} />
          </div>
        </div>
      )}
    </div>
  );
}

export default function Home() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=Noto+Sans+JP:wght@400;600;700;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        body {
          background: #0A0A0F;
          color: #E5E7EB;
          font-family: 'Noto Sans JP', system-ui, sans-serif;
          -webkit-font-smoothing: antialiased;
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .hero-gradient {
          background: linear-gradient(135deg, #D97706 0%, #F59E0B 25%, #D97706 50%, #B45309 75%, #D97706 100%);
          background-size: 300% 300%;
          animation: gradient 6s ease infinite;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .glow-line {
          height: 1px;
          background: linear-gradient(90deg, transparent, #D9770640, #D97706, #D9770640, transparent);
        }
        .status-dot {
          width: 8px; height: 8px;
          background: #10B981;
          border-radius: 50%;
          animation: pulse 2s ease-in-out infinite;
          box-shadow: 0 0 8px #10B98180;
        }
      `}</style>

      <div style={{ minHeight: "100vh", position: "relative", overflow: "hidden" }}>
        {/* Background grid */}
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
            pointerEvents: "none",
          }}
        />
        {/* Radial glow */}
        <div
          style={{
            position: "fixed",
            top: "-30%",
            left: "50%",
            transform: "translateX(-50%)",
            width: "120%",
            height: "70%",
            background: "radial-gradient(ellipse at center, #D9770608 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />

        <main style={{ maxWidth: 720, margin: "0 auto", padding: "60px 24px 80px", position: "relative" }}>
          {/* ── Hero ── */}
          <section style={{ textAlign: "center", marginBottom: 64, animation: "fadeInUp 0.8s ease" }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                background: "rgba(16,185,129,0.08)",
                border: "1px solid rgba(16,185,129,0.2)",
                borderRadius: 100,
                padding: "6px 16px",
                fontSize: 12,
                fontWeight: 600,
                color: "#10B981",
                marginBottom: 32,
                letterSpacing: "0.04em",
              }}
            >
              <div className="status-dot" />
              OPERATIONAL
            </div>

            <h1
              style={{
                fontSize: "clamp(32px, 6vw, 48px)",
                fontWeight: 900,
                letterSpacing: "-0.03em",
                lineHeight: 1.2,
                marginBottom: 16,
              }}
            >
              <span className="hero-gradient">HubSpot MA</span>
              <br />
              <span style={{ color: "#E5E7EB" }}>MCP Server</span>
            </h1>

            <p
              style={{
                fontSize: 16,
                color: "#9CA3AF",
                maxWidth: 480,
                margin: "0 auto 32px",
                lineHeight: 1.7,
              }}
            >
              HubSpot ワークフローを AI アシスタントから直接操作。
              <br />
              Claude・Cursor・VS Code など主要ツールに即接続。
            </p>

            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 12,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 12,
                padding: "12px 20px",
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 13,
              }}
            >
              <span style={{ color: "#6B7280" }}>endpoint</span>
              <span style={{ color: "#A5F3FC" }}>/api/mcp</span>
              <CopyButton text={MCP_URL} label="コピー" color="#D97706" />
            </div>
          </section>

          <div className="glow-line" style={{ marginBottom: 64 }} />

          {/* ── クイック接続 ── */}
          <section style={{ marginBottom: 64, animation: "fadeInUp 0.8s ease 0.2s both" }}>
            <h2
              style={{
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: "0.12em",
                color: "#D97706",
                textTransform: "uppercase",
                marginBottom: 24,
              }}
            >
              クイック接続
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {CLIENTS.map((client) => (
                <ClientCard key={client.id} client={client} />
              ))}
            </div>
          </section>

          <div className="glow-line" style={{ marginBottom: 64 }} />

          {/* ── 利用可能なツール ── */}
          <section style={{ marginBottom: 64, animation: "fadeInUp 0.8s ease 0.4s both" }}>
            <h2
              style={{
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: "0.12em",
                color: "#D97706",
                textTransform: "uppercase",
                marginBottom: 24,
              }}
            >
              利用可能なツール
            </h2>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                gap: 12,
              }}
            >
              {TOOLS.map((tool) => (
                <div
                  key={tool.name}
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    borderRadius: 12,
                    padding: "16px 20px",
                  }}
                >
                  <div style={{ fontSize: 24, marginBottom: 8 }}>{tool.emoji}</div>
                  <div
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 12,
                      color: "#A5F3FC",
                      marginBottom: 4,
                    }}
                  >
                    {tool.name}
                  </div>
                  <div style={{ fontSize: 13, color: "#9CA3AF" }}>{tool.desc}</div>
                </div>
              ))}
            </div>
          </section>

          <div className="glow-line" style={{ marginBottom: 64 }} />

          {/* ── 技術仕様 ── */}
          <section style={{ marginBottom: 64, animation: "fadeInUp 0.8s ease 0.6s both" }}>
            <h2
              style={{
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: "0.12em",
                color: "#D97706",
                textTransform: "uppercase",
                marginBottom: 24,
              }}
            >
              技術仕様
            </h2>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
                gap: 12,
              }}
            >
              {[
                { label: "Framework", value: "Next.js 15" },
                { label: "Transport", value: "Streamable HTTP" },
                { label: "Protocol", value: "MCP 2025-03-26" },
                { label: "API", value: "HubSpot v4 Beta" },
                { label: "Hosting", value: "Vercel" },
                { label: "Language", value: "TypeScript" },
              ].map((spec) => (
                <div
                  key={spec.label}
                  style={{
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.05)",
                    borderRadius: 10,
                    padding: "14px 18px",
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      color: "#6B7280",
                      fontWeight: 600,
                      letterSpacing: "0.06em",
                      marginBottom: 4,
                    }}
                  >
                    {spec.label}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#E5E7EB" }}>
                    {spec.value}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ── Footer ── */}
          <footer style={{ textAlign: "center", fontSize: 12, color: "#4B5563", paddingTop: 20 }}>
            <a
              href="https://github.com/DaisukeHori/hubspot-ma-mcp"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: "#6B7280",
                textDecoration: "none",
                borderBottom: "1px solid #374151",
                paddingBottom: 2,
              }}
            >
              GitHub
            </a>
            <span style={{ margin: "0 12px" }}>·</span>
            <span>Revol Corporation</span>
            <span style={{ margin: "0 12px" }}>·</span>
            <span>MIT License</span>
          </footer>
        </main>
      </div>
    </>
  );
}
