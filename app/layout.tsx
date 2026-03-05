import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "HubSpot MA MCP Server — 117ツール搭載のマーケティング自動化AI基盤",
  description:
    "AIをHubSpotのマーケティング担当者にする。116のMCPツール + 暗黙知を学習するKnowledge Store + 行動規範のClaude Skill。「セミナーやるからよろしく」で動くAI MA担当者。",
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
    title: "HubSpot MA MCP Server — 116 Tools",
    description:
      "AIをHubSpotのMA担当者にする。117ツール + Knowledge Store + Claude Skill",
    url: "https://hubspot-ma-mcp.vercel.app",
    siteName: "HubSpot MA MCP Server",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "HubSpot MA MCP Server — 116 Tools for Marketing Automation with Claude AI",
      },
    ],
    locale: "ja_JP",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "HubSpot MA MCP Server — 116 Tools",
    description:
      "Claude AIからHubSpotのMA全操作を可能にする117ツール搭載MCPサーバー",
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
