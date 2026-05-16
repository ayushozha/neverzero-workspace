import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NeverZero — the workspace that doesn't reset",
  description:
    "One living document where humans and five named agents share plans, memory, and decisions across laptop, phone, teammate, and timezone.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
