import type { Metadata } from "next";
import { Shell } from "@/components/shell";
import "./globals.css";

export const metadata: Metadata = {
  title: "OmniPost",
  description: "一次写稿，按中国互联网高峰发到微博、公众号、小红书与海外平台",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="font-sans antialiased">
        <div className="grain pointer-events-none fixed inset-0 opacity-40 mix-blend-overlay" />
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
