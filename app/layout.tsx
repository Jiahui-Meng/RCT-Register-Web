import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RCT Registration",
  description: "Priority-based RCT registration system"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
