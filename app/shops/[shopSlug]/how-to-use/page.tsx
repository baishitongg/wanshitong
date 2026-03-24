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

function getStepsByShopType(shopType: ShopType): StepItem[] {
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
        title: "选择预约日期和时段",
        description: "先从日期中选择想预约的一天，再挑选当天仍可预约的具体时间。",
        highlights: ["预约日期", "预约时段"],
      },
      {
        icon: Send,
        step: "步骤三",
        title: "提交预约并等待店铺联系",
        description: "确认预约内容后提交订单，店铺会通过 WhatsApp 或 Telegram 尽快与您联系。",
        highlights: ["提交预约", "WhatsApp", "Telegram"],
      },
    ];
  }

  return [
    {
      icon: ShoppingBag,
      step: "步骤一",
      title: "先把商品加入购物车",
      description: "浏览商品后点击加购，把想买的商品先放进购物车。",
      highlights: ["加购"],
    },
    {
      icon: Send,
      step: "步骤二",
      title: "勾选本次要结算的商品",
      description: "打开购物车后，勾选这次要买的商品，然后点击去结算。",
      highlights: ["购物车", "去结算"],
    },
    {
      icon: MapPin,
      step: "步骤三",
      title: "选择地址和首选沟通方式",
      description: "进入结算页后，选择收货地址，再设置手机号或 Telegram 作为首选联系方式。",
      highlights: ["收货地址", "手机号", "Telegram"],
    },
  ];
}

function getIntroByShopType(shopType: ShopType) {
  if (shopType === "SERVICE") {
    return "第一次预约也不用担心。跟着下面 3 个步骤操作，就可以顺利完成预约。";
  }

  return "第一次使用也不用担心。跟着下面 3 个步骤操作，就可以顺利完成下单。";
}

export default async function ShopHowToUsePage({ params }: Props) {
  const { shopSlug } = await params;
  const shop = await requireShopBySlug(shopSlug);
  const theme = resolveShopTheme(shop);
  const steps = getStepsByShopType(shop.shopType as ShopType);
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
