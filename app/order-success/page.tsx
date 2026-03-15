"use client";

import Link from "next/link";
import { CheckCircle2, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function OrderSuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("id");

  return (
    <div className="container mx-auto px-6 md:px-20 py-24 flex flex-col items-center text-center gap-6 max-w-lg">
      <div className="relative">
        <div className="absolute inset-0 blur-2xl bg-green-400/20 rounded-full" />
        <CheckCircle2 className="relative h-20 w-20 text-green-600" />
      </div>
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">下单成功！</h1>
        <p className="text-muted-foreground">
          感谢您的购买，我们将尽快与您联系确认订单。
        </p>
        {orderId && (
          <p className="text-xs text-muted-foreground font-mono bg-muted px-3 py-1.5 rounded-md inline-block mt-2">
            订单编号：{orderId}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2 text-sm text-muted-foreground bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-xl px-5 py-4">
        <MessageCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
        <span>如有疑问，欢迎通过微信联系我们的客服人员。</span>
      </div>
      <Link href="/">
        <Button variant="outline">继续购物</Button>
      </Link>
    </div>
  );
}

export default function OrderSuccessPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <Suspense>
        <OrderSuccessContent />
      </Suspense>
    </div>
  );
}