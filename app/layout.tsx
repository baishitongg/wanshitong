import type { Metadata } from "next";
import "./globals.css";
import { SessionProvider } from "next-auth/react";
import { Toaster } from "sonner";
import QueryProvider from "@/components/QueryProvider";

export const metadata: Metadata = {
  title: "万事通 · 中国超市",
  description: "正宗中国商品，品种齐全，物美价廉，就在您身边。",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <SessionProvider>
          <QueryProvider>
            {children}
          </QueryProvider>
        </SessionProvider>
        <Toaster richColors position="bottom-right" duration={2000}/>
      </body>
    </html>
  );
}
