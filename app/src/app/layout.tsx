import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "VydeoAI — AI-Powered Video Editor",
  description: "Create stunning videos with AI. Generate, edit, and elevate your content with VydeoAI.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body style={{ margin: 0, padding: 0 }}>{children}</body>
    </html>
  );
}
