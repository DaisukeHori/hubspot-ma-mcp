"use client";

import { useState, useEffect } from "react";

const MCP_URL = "https://hubspot-ma-mcp.vercel.app/api/mcp";
const TOKEN_PLACEHOLDER = "pat-na1-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx";

function Sprocket({ size = 32, color = "#FF7A59" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M50 10C27.9 10 10 27.9 10 50s17.9 40 40 40 40-17.9 40-40S72.1 10 50 10zm0 60c-11 0-20-9-20-20s9-20 20-20 20 9 20 20-9 20-20 20z" fill={color} />
      <circle cx="50" cy="12" r="8" fill={color} />
      <circle cx="83" cy="31" r="8" fill={color} />
      <circle cx="83" cy="69" r="8" fill={color} />
      <circle cx="50" cy="88" r="8" fill={color} />
      <circle cx="17" cy="69" r="8" fill={color} />
      <circle cx="17" cy="31" r="8" fill={color} />
    </svg>
  );
}

type ClientId = "claude-web" | "claude-desktop" | "claude-code" | "cursor" | "vscode" | "windsurf" | "api";
interface ClientConfig { id: ClientId; name: string; icon: string; description: string; copyContent: string; copyLabel: string; instructions: string[]; note?: string; }

const CLIENTS: ClientConfig[] = [
  { id: "claude-web", name: "Claude.ai", icon: "◈", description: "Web版（Pro/Max/Team/Enterprise）", copyContent: MCP_URL, copyLabel: "URLをコピー", instructions: ['設定→コネクタ→「カスタムコネクタを追加」', "URLを貼り付けて「追加」"], note: "Claude.aiではカスタムヘッダー不可。自前デプロイ＋環境変数方式が必要です。" },
  { id: "claude-desktop", name: "Claude Desktop", icon: "◇", description: "デスクトップアプリ（macOS/Windows）", copyContent: JSON.stringify({ mcpServers: { "hubspot-ma": { command: "npx", args: ["mcp-remote", MCP_URL, "--header", `Authorization:Bearer ${TOKEN_PLACEHOLDER}`] } } }, null, 2), copyLabel: "JSONをコピー", instructions: ["macOS: ~/Library/Application Support/Claude/claude_desktop_config.json", "Windows: %APPDATA%\\Claude\\claude_desktop_config.json", "pat-na1-xxxx…を自分のトークンに置換→再起動"] },
  { id: "claude-code", name: "Claude Code", icon: "⌘", description: "ターミナルCLI", copyContent: `claude mcp add --transport http hubspot-ma ${MCP_URL} --header "Authorization:Bearer ${TOKEN_PLACEHOLDER}"`, copyLabel: "コマンドをコピー", instructions: ["pat-na1-xxxx…を自分のトークンに置換して実行"] },
  { id: "cursor", name: "Cursor", icon: "⟐", description: "AIコードエディタ", copyContent: JSON.stringify({ mcpServers: { "hubspot-ma": { type: "http", url: MCP_URL, headers: { Authorization: `Bearer ${TOKEN_PLACEHOLDER}` } } } }, null, 2), copyLabel: "JSONをコピー", instructions: ["Settings→Tools & Integrations→New MCP Server", "または ~/.cursor/mcp.json に貼り付け"] },
  { id: "vscode", name: "VS Code", icon: "⬡", description: "Visual Studio Code（Copilot Chat）", copyContent: JSON.stringify({ mcpServers: { "hubspot-ma": { type: "http", url: MCP_URL, headers: { Authorization: `Bearer ${TOKEN_PLACEHOLDER}` } } } }, null, 2), copyLabel: "JSONをコピー", instructions: [".vscode/mcp.json またはユーザー設定に貼り付け"] },
  { id: "windsurf", name: "Windsurf", icon: "◆", description: "AIコードエディタ", copyContent: JSON.stringify({ mcpServers: { "hubspot-ma": { command: "npx", args: ["mcp-remote", MCP_URL, "--header", `Authorization:Bearer ${TOKEN_PLACEHOLDER}`] } } }, null, 2), copyLabel: "JSONをコピー", instructions: ["Cascade→MCP servers→Add Server"] },
  { id: "api", name: "Anthropic API", icon: "⬢", description: "MCP Connector Beta", copyContent: JSON.stringify({ mcp_servers: [{ type: "url", url: MCP_URL, name: "hubspot-ma", authorization_token: `Bearer ${TOKEN_PLACEHOLDER}` }], tools: [{ type: "mcp_toolset", mcp_server_name: "hubspot-ma" }] }, null, 2), copyLabel: "JSONをコピー", instructions: ["messages API bodyに追加", '"anthropic-beta": "mcp-client-2025-11-20"'] },
];

const TOOLS = [
  { name: "workflow_list", desc: "ワークフロー一覧取得", icon: "📋" },
  { name: "workflow_get", desc: "ワークフロー詳細取得", icon: "🔍" },
  { name: "workflow_create", desc: "ワークフロー作成", icon: "✨" },
  { name: "workflow_update", desc: "ワークフロー更新", icon: "🔄" },
  { name: "workflow_delete", desc: "ワークフロー削除", icon: "🗑" },
  { name: "workflow_batch_read", desc: "一括取得", icon: "📦" },
];

function CopyBtn({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); } catch {
      const t = document.createElement("textarea");
      t.value = text; document.body.appendChild(t); t.select();
      document.execCommand("copy"); document.body.removeChild(t);
    }
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };
  return (<button onClick={copy} className="hs-btn hs-btn--primary" style={{ gap: 6 }}>{copied ? "✓ コピー完了" : label}</button>);
}

function ClientRow({ c }: { c: ClientConfig }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="hs-accordion">
      <button className="hs-accordion__trigger" onClick={() => setOpen(!open)}>
        <span className="hs-accordion__icon">{c.icon}</span>
        <span className="hs-accordion__content"><strong>{c.name}</strong><span className="hs-accordion__desc">{c.description}</span></span>
        <svg className={`hs-accordion__chevron ${open ? "hs-accordion__chevron--open" : ""}`} width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M5 8l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </button>
      {open && (
        <div className="hs-accordion__body">
          <ol className="hs-steps">{c.instructions.map((s, i) => <li key={i}>{s}</li>)}</ol>
          {c.note && <div className="hs-callout">{c.note}</div>}
          <pre className="hs-code"><code>{c.copyContent}</code></pre>
          <CopyBtn text={c.copyContent} label={c.copyLabel} />
        </div>
      )}
    </div>
  );
}

export default function Home() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lexend+Deca:wght@300;400;500;600;700;800&display=swap');
        :root{--hs-orange:#FF7A59;--hs-orange-dark:#E8603C;--hs-orange-light:#FFF1EE;--hs-slate:#33475B;--hs-obsidian:#2D3E50;--hs-calypso:#00A4BD;--hs-calypso-light:#E5F5F8;--hs-text:#33475B;--hs-text-light:#516F90;--hs-border:#CBD6E2;--hs-bg:#F5F8FA;--hs-white:#FFFFFF;--hs-radius:8px;--hs-radius-lg:16px;--hs-shadow:0 1px 3px rgba(45,62,80,0.06);--hs-shadow-md:0 4px 12px rgba(45,62,80,0.08);--hs-shadow-lg:0 8px 30px rgba(45,62,80,0.1)}
        *{box-sizing:border-box;margin:0;padding:0}html{scroll-behavior:smooth}
        body{font-family:'Lexend Deca',-apple-system,BlinkMacSystemFont,sans-serif;color:var(--hs-text);background:var(--hs-white);-webkit-font-smoothing:antialiased;line-height:1.6}
        .hs-nav{position:sticky;top:0;z-index:100;background:rgba(255,255,255,0.95);backdrop-filter:blur(12px);border-bottom:1px solid var(--hs-border);padding:0 24px}
        .hs-nav__inner{max-width:1080px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;height:64px}
        .hs-nav__brand{display:flex;align-items:center;gap:10px;text-decoration:none;color:var(--hs-obsidian);font-weight:700;font-size:17px;letter-spacing:-0.02em}
        .hs-nav__links{display:flex;gap:28px;list-style:none}
        .hs-nav__links a{color:var(--hs-text-light);text-decoration:none;font-size:14px;font-weight:500;transition:color 0.15s}
        .hs-nav__links a:hover{color:var(--hs-orange)}
        .hs-badge{display:inline-flex;align-items:center;gap:6px;background:#DBFAE6;color:#00875A;font-size:12px;font-weight:600;padding:4px 12px;border-radius:100px}
        .hs-badge__dot{width:6px;height:6px;background:#00875A;border-radius:50%;animation:dotPulse 2s ease-in-out infinite}
        @keyframes dotPulse{0%,100%{opacity:1}50%{opacity:0.4}}
        .hs-hero{background:linear-gradient(170deg,var(--hs-white) 0%,var(--hs-orange-light) 50%,var(--hs-white) 100%);padding:80px 24px 60px;text-align:center;position:relative;overflow:hidden}
        .hs-hero::before{content:'';position:absolute;top:-200px;right:-200px;width:600px;height:600px;background:radial-gradient(circle,rgba(255,122,89,0.06) 0%,transparent 70%);pointer-events:none}
        .hs-hero__inner{max-width:680px;margin:0 auto;position:relative}
        .hs-hero__tag{display:inline-flex;align-items:center;gap:8px;background:var(--hs-white);border:1px solid var(--hs-border);border-radius:100px;padding:6px 16px 6px 8px;font-size:13px;color:var(--hs-text-light);font-weight:500;margin-bottom:28px;box-shadow:var(--hs-shadow)}
        .hs-hero__tag-icon{background:var(--hs-orange);color:white;width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700}
        .hs-hero h1{font-size:clamp(32px,5.5vw,52px);font-weight:800;color:var(--hs-obsidian);letter-spacing:-0.035em;line-height:1.15;margin-bottom:20px}
        .hs-hero h1 span{color:var(--hs-orange)}
        .hs-hero__sub{font-size:18px;color:var(--hs-text-light);font-weight:400;max-width:540px;margin:0 auto 36px;line-height:1.7}
        .hs-hero__endpoint{display:inline-flex;align-items:center;gap:12px;background:var(--hs-white);border:1px solid var(--hs-border);border-radius:var(--hs-radius);padding:12px 14px 12px 20px;font-family:'SF Mono','Fira Code',monospace;font-size:14px;color:var(--hs-obsidian);box-shadow:var(--hs-shadow-md)}
        .hs-section{max-width:860px;margin:0 auto;padding:64px 24px}
        .hs-section__label{display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:var(--hs-orange);margin-bottom:8px}
        .hs-section__title{font-size:28px;font-weight:700;color:var(--hs-obsidian);letter-spacing:-0.025em;margin-bottom:12px}
        .hs-section__desc{font-size:15px;color:var(--hs-text-light);max-width:560px;margin-bottom:32px;line-height:1.7}
        .hs-divider{max-width:860px;margin:0 auto;height:1px;background:var(--hs-border)}
        .hs-auth-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:16px}
        .hs-auth-card{background:var(--hs-white);border:1px solid var(--hs-border);border-radius:var(--hs-radius-lg);padding:28px;transition:box-shadow 0.2s,border-color 0.2s}
        .hs-auth-card:hover{box-shadow:var(--hs-shadow-lg);border-color:var(--hs-orange)}
        .hs-auth-card__badge{display:inline-block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;padding:3px 10px;border-radius:4px;margin-bottom:14px}
        .hs-auth-card__badge--rec{background:#DBFAE6;color:#00875A}
        .hs-auth-card__badge--alt{background:var(--hs-calypso-light);color:#0091AE}
        .hs-auth-card h4{font-size:17px;font-weight:700;color:var(--hs-obsidian);margin-bottom:8px}
        .hs-auth-card p{font-size:14px;color:var(--hs-text-light);line-height:1.65}
        .hs-auth-card code{background:var(--hs-bg);padding:2px 7px;border-radius:4px;font-size:12px;font-family:'SF Mono','Fira Code',monospace;color:var(--hs-obsidian)}
        .hs-btn{display:inline-flex;align-items:center;justify-content:center;border:none;border-radius:var(--hs-radius);font-family:inherit;font-size:14px;font-weight:600;padding:10px 20px;cursor:pointer;transition:all 0.15s;letter-spacing:-0.01em}
        .hs-btn--primary{background:var(--hs-orange);color:white}
        .hs-btn--primary:hover{background:var(--hs-orange-dark)}
        .hs-accordion{background:var(--hs-white);border:1px solid var(--hs-border);border-radius:var(--hs-radius-lg);overflow:hidden;transition:box-shadow 0.2s}
        .hs-accordion:hover{box-shadow:var(--hs-shadow-md)}
        .hs-accordion__trigger{width:100%;background:transparent;border:none;padding:18px 24px;display:flex;align-items:center;gap:14px;cursor:pointer;font-family:inherit;text-align:left;color:var(--hs-text)}
        .hs-accordion__icon{width:40px;height:40px;background:var(--hs-bg);border-radius:var(--hs-radius);display:flex;align-items:center;justify-content:center;font-size:18px;color:var(--hs-orange);flex-shrink:0}
        .hs-accordion__content{flex:1;display:flex;flex-direction:column;gap:2px}
        .hs-accordion__content strong{font-size:15px;font-weight:600;color:var(--hs-obsidian)}
        .hs-accordion__desc{font-size:13px;color:var(--hs-text-light)}
        .hs-accordion__chevron{color:var(--hs-text-light);transition:transform 0.25s;flex-shrink:0}
        .hs-accordion__chevron--open{transform:rotate(180deg)}
        .hs-accordion__body{padding:0 24px 24px;border-top:1px solid var(--hs-border);animation:slideIn 0.25s ease}
        @keyframes slideIn{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}
        .hs-accordion + .hs-accordion{margin-top:8px}
        .hs-steps{padding:16px 0 12px 20px;font-size:14px;line-height:1.8;color:var(--hs-text)}
        .hs-callout{background:#FEF3E2;border-left:3px solid #F5A623;border-radius:4px;padding:10px 14px;font-size:13px;color:#7A5100;margin-bottom:12px;line-height:1.6}
        .hs-code{background:var(--hs-obsidian);color:#E2E8F0;border-radius:var(--hs-radius);padding:16px 20px;overflow-x:auto;font-size:12px;line-height:1.7;font-family:'SF Mono','Fira Code',monospace;margin-bottom:16px}
        .hs-tools-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:12px}
        .hs-tool-card{background:var(--hs-white);border:1px solid var(--hs-border);border-radius:var(--hs-radius-lg);padding:22px;transition:all 0.2s}
        .hs-tool-card:hover{border-color:var(--hs-orange);box-shadow:var(--hs-shadow-md);transform:translateY(-2px)}
        .hs-tool-card__icon{font-size:26px;margin-bottom:10px}
        .hs-tool-card__name{font-family:'SF Mono','Fira Code',monospace;font-size:13px;color:var(--hs-obsidian);font-weight:600;margin-bottom:4px}
        .hs-tool-card__desc{font-size:13px;color:var(--hs-text-light)}
        .hs-specs{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px}
        .hs-spec{background:var(--hs-bg);border-radius:var(--hs-radius);padding:18px 20px}
        .hs-spec__label{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:var(--hs-text-light);margin-bottom:4px}
        .hs-spec__value{font-size:15px;font-weight:700;color:var(--hs-obsidian)}
        .hs-cta-banner{background:var(--hs-obsidian);border-radius:var(--hs-radius-lg);padding:48px 32px;text-align:center;margin-top:16px}
        .hs-cta-banner h3{font-size:24px;font-weight:700;color:white;margin-bottom:12px;letter-spacing:-0.02em}
        .hs-cta-banner p{font-size:15px;color:#A3B8CC;margin-bottom:24px}
        .hs-cta-banner .hs-btn--primary{font-size:15px;padding:12px 28px}
        .hs-footer{max-width:860px;margin:0 auto;padding:32px 24px 48px;text-align:center;font-size:13px;color:var(--hs-text-light)}
        .hs-footer a{color:var(--hs-text-light);text-decoration:underline;text-underline-offset:3px}
        .hs-footer a:hover{color:var(--hs-orange)}
        .hs-fade{opacity:0;transform:translateY(16px);transition:opacity 0.6s ease,transform 0.6s ease}
        .hs-fade--in{opacity:1;transform:translateY(0)}
        @media(max-width:640px){.hs-nav__links{display:none}.hs-hero{padding:48px 20px 40px}.hs-hero h1{font-size:28px}.hs-hero__sub{font-size:15px}.hs-section{padding:40px 20px}.hs-auth-grid{grid-template-columns:1fr}.hs-hero__endpoint{font-size:11px;flex-wrap:wrap;justify-content:center}}
      `}</style>

      <nav className="hs-nav">
        <div className="hs-nav__inner">
          <a href="#" className="hs-nav__brand"><Sprocket size={28} />HubSpot MA</a>
          <ul className="hs-nav__links">
            <li><a href="#auth">認証</a></li>
            <li><a href="#setup">セットアップ</a></li>
            <li><a href="#tools">ツール</a></li>
            <li><a href="#specs">技術仕様</a></li>
          </ul>
          <span className="hs-badge"><span className="hs-badge__dot" /> Operational</span>
        </div>
      </nav>

      <section className="hs-hero">
        <div className={`hs-hero__inner hs-fade ${mounted ? "hs-fade--in" : ""}`}>
          <div className="hs-hero__tag">
            <span className="hs-hero__tag-icon">⚡</span>
            MCP Protocol 2025-03-26 · Streamable HTTP
          </div>
          <h1>AIから<span>ワークフロー</span>を<br />直接操作しよう</h1>
          <p className="hs-hero__sub">HubSpot Marketing Automationを Claude・Cursor・VS Code など あらゆるAIツールからシームレスに操作できるMCPサーバー。</p>
          <div className="hs-hero__endpoint">
            <span style={{ color: "var(--hs-text-light)", fontSize: 12 }}>ENDPOINT</span>
            <span>{MCP_URL}</span>
            <CopyBtn text={MCP_URL} label="コピー" />
          </div>
        </div>
      </section>

      <div className="hs-divider" />
      <section id="auth" className="hs-section">
        <div className="hs-section__label"><Sprocket size={14} /> AUTHENTICATION</div>
        <h2 className="hs-section__title">認証方式</h2>
        <p className="hs-section__desc">自分のHubSpot Private Appトークンを指定するだけ。サーバーのデプロイ不要で、誰でも自分のアカウントを操作できます。</p>
        <div className="hs-auth-grid">
          <div className="hs-auth-card">
            <span className="hs-auth-card__badge hs-auth-card__badge--rec">推奨</span>
            <h4>Bearer Token</h4>
            <p>MCPクライアントの設定で <code>Authorization: Bearer &lt;token&gt;</code> ヘッダーを指定。サーバーデプロイ不要。</p>
          </div>
          <div className="hs-auth-card">
            <span className="hs-auth-card__badge hs-auth-card__badge--alt">代替</span>
            <h4>環境変数フォールバック</h4>
            <p>自前デプロイ時に <code>HUBSPOT_ACCESS_TOKEN</code> を設定。チーム共用に最適。</p>
          </div>
        </div>
      </section>

      <div className="hs-divider" />
      <section id="setup" className="hs-section">
        <div className="hs-section__label"><Sprocket size={14} /> QUICK SETUP</div>
        <h2 className="hs-section__title">クイック接続</h2>
        <p className="hs-section__desc">お使いのAIクライアントを選択して、設定をコピーするだけ。トークンはHubSpot Private Appで発行してください。</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {CLIENTS.map((c) => <ClientRow key={c.id} c={c} />)}
        </div>
      </section>

      <div className="hs-divider" />
      <section id="tools" className="hs-section">
        <div className="hs-section__label"><Sprocket size={14} /> AVAILABLE TOOLS</div>
        <h2 className="hs-section__title">利用可能なツール</h2>
        <p className="hs-section__desc">HubSpot Automation API v4を通じて、ワークフローのCRUD操作をAIから実行。</p>
        <div className="hs-tools-grid">
          {TOOLS.map((t) => (
            <div key={t.name} className="hs-tool-card">
              <div className="hs-tool-card__icon">{t.icon}</div>
              <div className="hs-tool-card__name">{t.name}</div>
              <div className="hs-tool-card__desc">{t.desc}</div>
            </div>
          ))}
        </div>
      </section>

      <div className="hs-divider" />
      <section id="specs" className="hs-section">
        <div className="hs-section__label"><Sprocket size={14} /> TECH SPECS</div>
        <h2 className="hs-section__title">技術仕様</h2>
        <div className="hs-specs">
          {[{l:"Framework",v:"Next.js 15"},{l:"Transport",v:"Streamable HTTP"},{l:"Protocol",v:"MCP 2025-03-26"},{l:"Auth",v:"Bearer Token"},{l:"API",v:"HubSpot v4 Beta"},{l:"Hosting",v:"Vercel"}].map((s) => (
            <div key={s.l} className="hs-spec"><div className="hs-spec__label">{s.l}</div><div className="hs-spec__value">{s.v}</div></div>
          ))}
        </div>
        <div className="hs-cta-banner">
          <h3>自分のアカウントで試してみよう</h3>
          <p>HubSpot Private Appを作成して、Bearer Tokenを設定するだけ。</p>
          <a href="https://github.com/DaisukeHori/hubspot-ma-mcp" target="_blank" rel="noopener noreferrer" className="hs-btn hs-btn--primary">GitHubで詳細を見る →</a>
        </div>
      </section>

      <footer className="hs-footer">
        <a href="https://github.com/DaisukeHori/hubspot-ma-mcp" target="_blank" rel="noopener noreferrer">GitHub</a>
        {" · "}Revol Corporation{" · "}MIT License
      </footer>
    </>
  );
}
