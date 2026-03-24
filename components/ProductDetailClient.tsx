"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Check, MessageCircle, Minus, Package, Plus, ShoppingCart, Tag } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useShopCart } from "@/lib/store/cartStore";
import { normalizeServiceAttributes } from "@/lib/service-booking";
import type { ShopTheme } from "@/lib/shopTheme";
import type { Product } from "@/types";

interface Props {
  shopSlug: string;
  product: Product;
  theme?: ShopTheme;
  supportTelegram?: string | null;
}

function EmptyImageState() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
      <Package className="h-20 w-20 opacity-20" />
      <span className="text-sm">暂无图片</span>
    </div>
  );
}

function buildTelegramLink(username: string) {
  return `https://t.me/${username.replace(/^@+/, "")}`;
}

export default function ProductDetailClient({
  shopSlug,
  product,
  theme,
  supportTelegram,
}: Props) {
  const { data: session } = useSession();
  const router = useRouter();
  const { addItem } = useShopCart(shopSlug);

  const isService =
    product.itemType === "SERVICE" ||
    product.requiresScheduling ||
    product.fulfillmentType === "BOOKING";
  const gallery = normalizeServiceAttributes(product.attributes).galleryUrls;

  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [selectedGalleryImage, setSelectedGalleryImage] = useState<string | null>(null);

  const outOfStock = !isService && product.stock === 0;
  const maxQty = Math.min(product.stock, 99);
  const selectedMainImage = selectedGalleryImage ?? product.imageUrl ?? null;
  const telegramHref = supportTelegram ? buildTelegramLink(supportTelegram) : null;

  useEffect(() => {
    setSelectedGalleryImage(null);
  }, [product.id]);

  const stockLevel = outOfStock
    ? "out"
    : product.stock <= 5
      ? "low"
      : product.stock <= 20
        ? "medium"
        : "high";

  const stockColors = {
    out: "bg-red-100 text-red-700 border-red-200",
    low: "bg-orange-100 text-orange-700 border-orange-200",
    medium: "bg-yellow-100 text-yellow-700 border-yellow-200",
    high: "bg-green-100 text-green-700 border-green-200",
  };

  const stockLabels = {
    out: "已售罄",
    low: `仅剩 ${product.stock} 件`,
    medium: `库存 ${product.stock} 件`,
    high: `库存充足（${product.stock} 件）`,
  };

  const handleAddToCart = async () => {
    if (!session?.user) {
      toast.error("请先登录后再继续");
      router.push("/login");
      return;
    }

    await addItem(
      {
        id: product.id,
        name: product.name,
        price: product.price,
        imageUrl: product.imageUrl,
        stock: product.stock,
        itemType: product.itemType,
        fulfillmentType: product.fulfillmentType,
        requiresScheduling: product.requiresScheduling,
        requiresAddress: product.requiresAddress,
      },
      quantity,
    );

    toast.success(`已将 ${product.name} × ${quantity} 加入购物车`);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  if (isService) {
    return (
      <div className="space-y-8">
        <section className="overflow-hidden rounded-3xl border bg-white shadow-sm">
          <div className="grid gap-0 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
            <div className="space-y-4 border-b p-5 lg:border-b-0 lg:border-r lg:p-6">
              <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-2xl border bg-white p-5">
                {selectedMainImage ? (
                  <Image
                    src={selectedMainImage}
                    alt={product.name}
                    fill
                    className="object-contain p-5"
                    sizes="(max-width: 1024px) 100vw, 55vw"
                    priority
                  />
                ) : (
                  <EmptyImageState />
                )}
              </div>

              {gallery.length > 0 && (
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">服务图库</div>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {product.imageUrl && (
                      <button
                        type="button"
                        onClick={() => setSelectedGalleryImage(null)}
                        className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border bg-white transition-all sm:h-20 sm:w-20"
                        style={
                          !selectedGalleryImage
                            ? ({
                                borderColor: theme?.secondary ?? "#b91c1c",
                                boxShadow: `0 0 0 2px ${theme?.secondary ?? "#b91c1c"}22`,
                              } as never)
                            : undefined
                        }
                      >
                        <Image
                          src={product.imageUrl}
                          alt={`${product.name}-主图`}
                          fill
                          className="object-cover"
                        />
                        <span className="absolute inset-x-0 bottom-0 bg-black/55 px-1 py-0.5 text-[10px] text-white">
                          主图
                        </span>
                      </button>
                    )}

                    {gallery.map((image, index) => {
                      const selected = selectedMainImage === image;
                      return (
                        <button
                          key={`${image}-${index}`}
                          type="button"
                          onClick={() => setSelectedGalleryImage(image)}
                          className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border bg-white transition-all sm:h-20 sm:w-20"
                          style={
                            selected
                              ? ({
                                  borderColor: theme?.secondary ?? "#b91c1c",
                                  boxShadow: `0 0 0 2px ${theme?.secondary ?? "#b91c1c"}22`,
                                } as never)
                              : undefined
                          }
                        >
                          <Image
                            src={image}
                            alt={`${product.name}-${index + 1}`}
                            fill
                            className="object-cover"
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-5 p-5 lg:p-6">
              {product.category && (
                <Badge variant="outline" className="flex w-fit items-center gap-1 text-xs">
                  <Tag className="h-3 w-3" />
                  {product.category.name}
                </Badge>
              )}

              <div className="space-y-3">
                <h1 className="text-3xl font-bold leading-tight text-foreground">{product.name}</h1>
                <div className="text-3xl font-bold" style={{ color: theme?.secondary ?? "#dc2626" }}>
                  RM{Number(product.price).toFixed(2)}
                </div>
                <span className="inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700">
                  服务预约
                </span>
              </div>

              {product.description && (
                <div className="rounded-2xl border bg-muted/20 p-4">
                  <div className="mb-2 text-sm font-medium text-foreground">服务说明</div>
                  <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                    {product.description}
                  </p>
                </div>
              )}

              <div className="rounded-2xl border bg-muted/20 p-4">
                <div className="mb-2 text-sm font-medium text-foreground">预约方式</div>
                <p className="text-sm leading-6 text-muted-foreground">
                  点击下方按钮后，将直接跳转到店铺 Telegram，与店铺客服联系预约。
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-4 rounded-3xl border bg-white p-5 shadow-sm lg:p-6">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-foreground">立即预约</h2>
            <p className="text-sm text-muted-foreground">
              通过 Telegram 与店铺联系，确认服务内容与预约安排。
            </p>
          </div>

          {telegramHref ? (
            <Button
              asChild
              size="lg"
              className="h-12 w-full text-base font-semibold text-white"
              style={{ backgroundColor: theme?.secondary ?? "#b91c1c" }}
            >
              <a href={telegramHref} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="mr-2 h-5 w-5" />
                预约
              </a>
            </Button>
          ) : (
            <div className="rounded-xl border border-dashed px-4 py-4 text-sm text-muted-foreground">
              当前店铺还没有设置 Telegram 联系方式，请先到后台补充店铺 Telegram 用户名。
            </div>
          )}
        </section>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:gap-12">
      <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-2xl border bg-white p-10">
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            className="object-contain p-8"
            sizes="(max-width: 768px) 100vw, 50vw"
            priority
          />
        ) : (
          <EmptyImageState />
        )}
      </div>

      <div className="flex flex-col gap-5 py-1">
        {product.category && (
          <div>
            <Badge variant="outline" className="flex w-fit items-center gap-1 text-xs">
              <Tag className="h-3 w-3" />
              {product.category.name}
            </Badge>
          </div>
        )}

        <h1 className="text-2xl font-bold leading-tight text-foreground md:text-3xl">
          {product.name}
        </h1>

        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold" style={{ color: theme?.secondary ?? "#dc2626" }}>
            RM{Number(product.price).toFixed(2)}
          </span>
        </div>

        <div>
          <span
            className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${stockColors[stockLevel]}`}
          >
            {stockLabels[stockLevel]}
          </span>
        </div>

        {product.description && (
          <div className="border-t border-border pt-4">
            <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
              {product.description}
            </p>
          </div>
        )}

        {!outOfStock && (
          <div className="space-y-4 border-t border-border pt-5">
            <div className="flex items-center gap-4">
              <span className="w-10 text-sm text-muted-foreground">数量</span>
              <div className="flex items-center overflow-hidden rounded-lg border border-border">
                <button
                  className="flex h-9 w-9 items-center justify-center text-muted-foreground transition-colors hover:bg-muted disabled:opacity-30"
                  onClick={() => setQuantity((current) => Math.max(1, current - 1))}
                  disabled={quantity <= 1}
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="flex h-9 w-12 items-center justify-center border-x border-border text-sm font-semibold">
                  {quantity}
                </span>
                <button
                  className="flex h-9 w-9 items-center justify-center text-muted-foreground transition-colors hover:bg-muted disabled:opacity-30"
                  onClick={() => setQuantity((current) => Math.min(maxQty, current + 1))}
                  disabled={quantity >= maxQty}
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
              <span className="text-xs text-muted-foreground">
                小计：
                <span className="ml-1 font-semibold text-foreground">
                  RM{(Number(product.price) * quantity).toFixed(2)}
                </span>
              </span>
            </div>

            <Button
              size="lg"
              className={`h-12 w-full text-base font-semibold transition-all ${
                added ? "bg-green-600 hover:bg-green-700" : "text-white"
              }`}
              style={added ? undefined : { backgroundColor: theme?.secondary ?? "#b91c1c" }}
              onClick={handleAddToCart}
            >
              {added ? (
                <>
                  <Check className="mr-2 h-5 w-5" />
                  已加入购物车
                </>
              ) : (
                <>
                  <ShoppingCart className="mr-2 h-5 w-5" />
                  加入购物车
                </>
              )}
            </Button>
          </div>
        )}

        {outOfStock && (
          <div className="border-t border-border pt-5">
            <Button size="lg" disabled className="h-12 w-full text-base">
              <Package className="mr-2 h-5 w-5" />
              已售罄
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
