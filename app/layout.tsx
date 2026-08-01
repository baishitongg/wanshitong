import type { Metadata } from "next";
import "./globals.css";
import { SessionProvider } from "next-auth/react";
import { Toaster } from "sonner";
import QueryProvider from "@/components/QueryProvider";

export const metadata: Metadata = {
  title: "壹号便民网 · 中国超市",
  description: "正宗中国商品，品种齐全，物美价廉，就在您身边。",
  icons: {
    icon: "/icon.svg",
  },
};

function getSupabaseOrigin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!url) return null;

  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const supabaseOrigin = getSupabaseOrigin();

  return (
    <html lang="zh-CN" suppressHydrationWarning>
      {supabaseOrigin ? (
        <head>
          <link rel="preconnect" href={supabaseOrigin} crossOrigin="" />
          <link rel="dns-prefetch" href={supabaseOrigin} />
        </head>
      ) : null}
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
