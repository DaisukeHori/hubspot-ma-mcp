import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "HubSpot MA MCP Server",
  description: "HubSpot Marketing Automation MCP Server — 128 Tools",
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
