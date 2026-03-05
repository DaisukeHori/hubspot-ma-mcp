import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "HubSpot MA MCP Server — 100ツール搭載のマーケティング自動化AI基盤",
  description:
    "CRM・フォーム・リスト・マーケティングメール・ワークフローなど100ツールを搭載。Claude AIからHubSpotのマーケティング自動化を完全操作できるMCP（Model Context Protocol）サーバー。",
  keywords: [
    "HubSpot",
    "MCP",
    "Model Context Protocol",
    "Marketing Automation",
    "Claude AI",
    "マーケティング自動化",
    "CRM",
    "AI",
    "Anthropic",
  ],
  authors: [{ name: "Daisuke Hori" }],
  openGraph: {
    title: "HubSpot MA MCP Server — 100 Tools",
    description:
      "CRM・フォーム・リスト・メール・ワークフローなど100ツールでHubSpotマーケティング自動化をAIから完全操作",
    url: "https://hubspot-ma-mcp.vercel.app",
    siteName: "HubSpot MA MCP Server",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "HubSpot MA MCP Server — 100 Tools for Marketing Automation with Claude AI",
      },
    ],
    locale: "ja_JP",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "HubSpot MA MCP Server — 100 Tools",
    description:
      "Claude AIからHubSpotのMA全操作を可能にする100ツール搭載MCPサーバー",
    images: ["/og-image.png"],
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/icon-512.png", type: "image/png", sizes: "512x512" },
    ],
    apple: "/apple-icon.png",
  },
  manifest: "/manifest.json",
  metadataBase: new URL("https://hubspot-ma-mcp.vercel.app"),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
