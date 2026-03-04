export const metadata = {
  title: "HubSpot MA MCP Server",
  description:
    "HubSpot Marketing Automation MCP Server for Claude",
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
