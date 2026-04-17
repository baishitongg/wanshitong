import Link from "next/link";
import { CheckCircle2, ChevronLeft, MessageCircle, Send } from "lucide-react";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { requireShopBySlug } from "@/lib/shops";
import { resolveShopTheme, withAlpha } from "@/lib/shopTheme";

type SearchParams = Promise<{
  id?: string;
  shop?: string;
}>;

interface Props {
  searchParams: SearchParams;
}

function buildWhatsAppHref(phone: string) {
  const normalized = phone.replace(/[^\d]/g, "");
  const text = encodeURIComponent("您好，我想咨询一下刚提交的订单。");
  return `https://wa.me/${normalized}?text=${text}`;
}

function buildTelegramHref(username: string) {
  return `https://t.me/${username.replace(/^@+/, "")}`;
}

export default async function OrderSuccessPage({ searchParams }: Props) {
  const { id: orderId, shop: shopSlug } = await searchParams;
  const shop = shopSlug ? await requireShopBySlug(shopSlug).catch(() => null) : null;
  const theme = resolveShopTheme(shop);
  const backHref = shop ? `/shops/${shop.slug}` : "/";
  const whatsappHref = shop?.whatsappPhone
    ? buildWhatsAppHref(shop.whatsappPhone)
    : null;
  const telegramHref = shop?.telegramUsername
    ? buildTelegramHref(shop.telegramUsername)
    : null;

  return (
    <div className="min-h-screen bg-background" style={{ backgroundColor: theme.surface }}>
      <Navbar
        shopSlug={shop?.slug}
        shopName={shop?.name}
        theme={theme}
        supportWhatsApp={shop?.whatsappPhone ?? null}
        supportTelegram={shop?.telegramUsername ?? null}
      />

      <div className="container mx-auto max-w-3xl px-6 py-8 md:px-20">
        {shop && (
          <div className="mb-6">
            <Link
              href={backHref}
              className="inline-flex items-center gap-2 text-sm transition-colors hover:opacity-80"
              style={{ color: theme.secondary }}
            >
              <ChevronLeft className="h-4 w-4" />
              返回店铺首页
            </Link>
          </div>
        )}

        <div className="mx-auto flex max-w-lg flex-col items-center gap-6 text-center">
          <div className="relative">
            <div
              className="absolute inset-0 rounded-full blur-2xl"
              style={{ backgroundColor: withAlpha(theme.accent, 0.18) }}
            />
            <CheckCircle2 className="relative h-20 w-20 text-green-600" />
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-foreground">下单成功!</h1>
            <p className="text-muted-foreground">
              订单已提交，商家会尽快通过您选择的联系方式提供付款方式并确认订单。
            </p>
            {orderId && (
              <p className="mt-2 inline-block rounded-md bg-muted px-3 py-1.5 font-mono text-xs text-muted-foreground">
                订单编号：{orderId}
              </p>
            )}
          </div>

          {(whatsappHref || telegramHref) && (
            <div
              className="w-full rounded-2xl border px-5 py-4 text-left"
              style={{
                borderColor: withAlpha(theme.secondary, 0.28),
                backgroundColor: withAlpha(theme.accent, 0.08),
              }}
            >
              <div className="mb-3 text-sm font-medium text-foreground">联系{shop?.name ?? "店铺"}客服</div>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>如需确认订单或付款方式，可通过以下方式联系店铺客服：</p>
                <div className="flex flex-wrap gap-3">
                  {whatsappHref && (
                    <a
                      href={whatsappHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-full border bg-white px-4 py-2 transition-colors hover:opacity-90"
                      style={{ borderColor: withAlpha(theme.secondary, 0.25) }}
                    >
                      <MessageCircle className="h-4 w-4 text-green-600" />
                      WhatsApp
                    </a>
                  )}

                  {telegramHref && (
                    <a
                      href={telegramHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-full border bg-white px-4 py-2 transition-colors hover:opacity-90"
                      style={{ borderColor: withAlpha(theme.secondary, 0.25) }}
                    >
                      <Send className="h-4 w-4 text-sky-600" />
                      Telegram
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}

          <Link href={backHref}>
            <Button variant="outline">继续购物</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
