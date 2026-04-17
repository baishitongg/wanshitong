import Link from "next/link";
import { ArrowLeft, CalendarClock, MapPin, Send, ShoppingBag } from "lucide-react";
import Navbar from "@/components/Navbar";
import { requireShopBySlug } from "@/lib/shops";
import { resolveShopTheme, withAlpha } from "@/lib/shopTheme";
import type { ShopType } from "@/types";

interface Props {
  params: Promise<{ shopSlug: string }>;
}

type StepItem = {
  icon: typeof ShoppingBag;
  step: string;
  title: string;
  description: string;
  highlights: string[];
};

function getStepsByShopType(shopType: ShopType, shopName: string): StepItem[] {
  if (shopType === "SERVICE") {
    return [
      {
        icon: ShoppingBag,
        step: "步骤一",
        title: "先选择想预约的服务",
        description: "浏览服务内容与图片，确认您想预约的项目后进入详情页。",
        highlights: ["服务项目"],
      },
      {
        icon: CalendarClock,
        step: "步骤二",
        title: "点击预约并跳转 Telegram",
        description: "进入服务详情页后，直接点击“预约”按钮，系统会带您跳转到店铺 Telegram。",
        highlights: ["预约按钮", "Telegram"],
      },
      {
        icon: Send,
        step: "步骤三",
        title: `告诉客服您来自${shopName}`,
        description: `在 Telegram 里告诉负责人您来自${shopName}，并说明想预约的服务项目，负责人会继续协助您确认内容并安排预约。`,
        highlights: [`来自${shopName}`, "服务名称", "客服协助"],
      },
    ];
  }

  return [
    {
      icon: ShoppingBag,
      step: "步骤一",
      title: "先把商品加入购物车",
      description: "浏览商品后点击加购，把这次想买的商品先放进购物车。",
      highlights: ["商品", "加入购物车"],
    },
    {
      icon: Send,
      step: "步骤二",
      title: "选择收货地址和联系方式",
      description: "打开购物车后，确认本次要结算的商品，选择收货地址，并选择 WhatsApp 或 Telegram 作为首选沟通方式。",
      highlights: ["收货地址", "WhatsApp", "Telegram"],
    },
    {
      icon: MapPin,
      step: "步骤三",
      title: "提交订单并等待店铺联系",
      description: "点击提交订单后，订单会直接交给店铺 staff。店铺会通过您选择的方式联系您，并提供付款方式与订单确认。",
      highlights: ["提交订单", "店铺 staff", "付款确认"],
    },
  ];
}

function getIntroByShopType(shopType: ShopType) {
  if (shopType === "SERVICE") {
    return "第一次预约也不用担心。现在无需选择日期和时段，直接点“预约”进入 Telegram，告诉负责人您来自本店并说明想预约的服务即可。";
  }

  return "第一次下单也不用担心。现在无需线上付款，跟着下面 3 个步骤操作，就可以把订单直接提交给店铺 staff 处理。";
}

export default async function ShopHowToUsePage({ params }: Props) {
  const { shopSlug } = await params;
  const shop = await requireShopBySlug(shopSlug);
  const theme = resolveShopTheme(shop);
  const steps = getStepsByShopType(shop.shopType as ShopType, shop.name);
  const intro = getIntroByShopType(shop.shopType as ShopType);

  return (
    <div className="min-h-screen bg-background" style={{ backgroundColor: theme.surface }}>
      <Navbar
        shopSlug={shop.slug}
        shopName={shop.name}
        theme={theme}
        supportWhatsApp={shop.whatsappPhone}
        supportTelegram={shop.telegramUsername}
        hideCart={shop.shopType === "SERVICE"}
      />

      <div className="container mx-auto max-w-5xl px-6 py-8 md:px-20 md:py-10">
        <Link
          href={`/shops/${shop.slug}`}
          className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          返回店铺首页
        </Link>

        <section
          className="rounded-[28px] border bg-card p-6 shadow-sm md:p-8"
          style={{ borderColor: withAlpha(theme.secondary, 0.18) }}
        >
          <span
            className="inline-flex rounded-full px-3 py-1 text-xs font-semibold tracking-[0.22em]"
            style={{
              backgroundColor: withAlpha(theme.accent, 0.12),
              color: theme.secondary,
            }}
          >
            使用说明
          </span>
          <h1 className="mt-4 text-3xl font-bold tracking-tight md:text-4xl">
            {shop.name} 使用说明
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
            {intro}
          </p>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          {steps.map((item) => {
            const Icon = item.icon;

            return (
              <article
                key={item.step}
                className="rounded-[24px] border bg-white p-5 shadow-sm transition-transform hover:-translate-y-0.5"
                style={{ borderColor: withAlpha(theme.secondary, 0.16) }}
              >
                <div
                  className="inline-flex rounded-2xl p-3"
                  style={{
                    backgroundColor: withAlpha(theme.accent, 0.1),
                    color: theme.secondary,
                  }}
                >
                  <Icon className="h-5 w-5" />
                </div>

                <p
                  className="mt-4 text-xs font-semibold tracking-[0.24em]"
                  style={{ color: theme.secondary }}
                >
                  {item.step}
                </p>
                <h2 className="mt-2 text-xl font-semibold">{item.title}</h2>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  {item.description}
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  {item.highlights.map((highlight) => (
                    <span
                      key={highlight}
                      className="inline-flex rounded-full px-3 py-1 text-xs font-semibold"
                      style={{
                        backgroundColor: withAlpha(theme.accent, 0.12),
                        color: theme.secondary,
                      }}
                    >
                      {highlight}
                    </span>
                  ))}
                </div>
              </article>
            );
          })}
        </section>
      </div>
    </div>
  );
}
