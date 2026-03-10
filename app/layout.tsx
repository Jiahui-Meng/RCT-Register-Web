import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hand Hygiene Training Trail - CUHK",
  description: "Location: Pathology Teaching Laboratory 6 , 1/F, Lui Che Woo Clinical Sciences Building, Prince of Wales Hospital"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
