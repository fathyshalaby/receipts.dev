import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Receipts — Multiplayer Review",
  description:
    "Browse published receipts: verified, video-backed proof of what agents shipped.",
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
