import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Suhba · صُحبة",
  metadataBase: new URL("https://suhba.hub71-hackat-7654.chatgpt.site"),
  alternates: { canonical: "/" },
  description: "Move, settle and build your future in Abu Dhabi with grounded evidence and private goal workspaces.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
