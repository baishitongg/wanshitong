"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import {
  Headset,
  LayoutDashboard,
  LogIn,
  LogOut,
  MessageCircle,
  Send,
  Settings,
  ShoppingCart,
  Store,
  User,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import CartDrawer from "@/components/CartDrawer";
import { buildShopHref } from "@/lib/shops";
import { useShopCart } from "@/lib/store/cartStore";

type SessionUser = {
  id?: string;
  name?: string | null;
  image?: string | null;
  phone?: string | null;
  role?: string;
};

type NavbarProps = {
  shopSlug?: string;
  shopName?: string;
  homeHref?: string;
};

const SUPPORT_WHATSAPP = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP ?? "";
const SUPPORT_TELEGRAM = process.env.NEXT_PUBLIC_SUPPORT_TELEGRAM ?? "";

function buildSupportWhatsAppLink() {
  const text = encodeURIComponent(
    "您好，我想咨询一下万事通的平台商品或订单服务。",
  );
  return `https://wa.me/${SUPPORT_WHATSAPP}?text=${text}`;
}

function buildSupportTelegramLink() {
  return `https://t.me/${SUPPORT_TELEGRAM.replace(/^@+/, "")}`;
}

export default function Navbar({
  shopSlug,
  shopName,
  homeHref = "/",
}: NavbarProps) {
  const { data: session, status } = useSession();
  const user = session?.user as SessionUser | undefined;
  const role = user?.role;
  const [cartOpen, setCartOpen] = useState(false);

  const shopCart = useShopCart(shopSlug ?? "__platform__");
  const { items, fetchCart, resetCart } = shopCart;
  const showCart = Boolean(shopSlug);
  const guideHref = shopSlug ? buildShopHref(shopSlug, "/how-to-use") : null;

  const totalItems = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items],
  );

  useEffect(() => {
    if (!shopSlug) return;

    if (status === "authenticated") {
      fetchCart();
    } else if (status === "unauthenticated") {
      resetCart();
    }
  }, [fetchCart, resetCart, shopSlug, status]);

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-red-900/30 bg-red-950 text-white">
        <div className="container mx-auto flex h-16 items-center justify-between px-6 md:px-20">
          <div className="flex items-center">
            <Link
              href={homeHref}
              className="flex items-center gap-2 text-xl font-bold text-white"
            >
              <Store className="h-6 w-6 text-red-300" />
              <span className="tracking-wide">万事通</span>
            </Link>
          </div>

          <nav className="hidden items-center gap-6 text-sm font-medium md:flex">
            <Link href="/" className="text-red-200 transition-colors hover:text-white">
              平台主页
            </Link>

            {shopSlug && (
              <Link
                href={buildShopHref(shopSlug)}
                className="text-red-200 transition-colors hover:text-white"
              >
                店铺主页
              </Link>
            )}

            {guideHref && (
              <Link
                href={guideHref}
                className="text-red-200 transition-colors hover:text-white"
              >
                使用说明
              </Link>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="inline-flex items-center gap-2 text-red-200 outline-none transition-colors hover:text-white">
                  <Headset className="h-4 w-4" />
                  客服
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="center" className="w-52">
                <DropdownMenuItem asChild>
                  <a
                    href={buildSupportWhatsAppLink()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2"
                  >
                    <MessageCircle className="h-4 w-4 text-green-600" />
                    WhatsApp 客服
                  </a>
                </DropdownMenuItem>

                <DropdownMenuItem asChild>
                  <a
                    href={buildSupportTelegramLink()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2"
                  >
                    <Send className="h-4 w-4 text-sky-600" />
                    Telegram 客服
                  </a>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>

          <div className="flex items-center gap-3 md:gap-6">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-red-900 hover:text-white md:hidden"
                >
                  <Headset className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="w-56">
                {guideHref && (
                  <>
                    <DropdownMenuItem asChild>
                      <Link href={guideHref} className="flex items-center gap-2">
                        <ShoppingCart className="h-4 w-4" />
                        使用说明
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}

                <DropdownMenuItem asChild>
                  <a
                    href={buildSupportWhatsAppLink()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2"
                  >
                    <MessageCircle className="h-4 w-4 text-green-600" />
                    WhatsApp 客服
                  </a>
                </DropdownMenuItem>

                <DropdownMenuItem asChild>
                  <a
                    href={buildSupportTelegramLink()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2"
                  >
                    <Send className="h-4 w-4 text-sky-600" />
                    Telegram 客服
                  </a>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {showCart && (
              <Button
                variant="ghost"
                size="icon"
                className="relative text-white hover:bg-red-900 hover:text-white"
                onClick={() => setCartOpen(true)}
              >
                <ShoppingCart className="h-5 w-5" />

                {totalItems > 0 && (
                  <Badge className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full border-0 bg-yellow-400 p-0 text-xs font-bold text-red-950">
                    {totalItems}
                  </Badge>
                )}
              </Button>
            )}

            {session ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative h-9 w-9 rounded-full hover:bg-red-900"
                  >
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={user?.image ?? ""} alt={user?.name ?? ""} />
                      <AvatarFallback className="bg-red-800 text-sm font-semibold text-white">
                        {user?.name?.charAt(0)?.toUpperCase() ?? "用"}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-medium">{user?.name ?? "用户"}</p>
                    <p className="text-xs text-muted-foreground">{user?.phone ?? ""}</p>
                  </div>

                  <DropdownMenuSeparator />

                  {(!role || role === "CUSTOMER") && (
                    <DropdownMenuItem asChild>
                      <Link
                        href={shopSlug ? `/profile?shop=${shopSlug}` : "/profile"}
                        className="flex items-center gap-2"
                      >
                        <User className="h-4 w-4" />
                        我的账户
                      </Link>
                    </DropdownMenuItem>
                  )}

                  {(role === "STAFF" || role === "ADMIN") && (
                    <DropdownMenuItem asChild>
                      <Link href="/staff" className="flex items-center gap-2">
                        <LayoutDashboard className="h-4 w-4" />
                        店铺后台
                      </Link>
                    </DropdownMenuItem>
                  )}

                  {role === "ADMIN" && (
                    <DropdownMenuItem asChild>
                      <Link href="/admin" className="flex items-center gap-2">
                        <Settings className="h-4 w-4" />
                        平台管理
                      </Link>
                    </DropdownMenuItem>
                  )}

                  <DropdownMenuSeparator />

                  <DropdownMenuItem
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="text-red-600 focus:text-red-600"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    退出登录
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => signIn()}
                className="flex items-center gap-2 border border-red-700 text-white hover:bg-red-900 hover:text-white"
              >
                <LogIn className="h-4 w-4" />
                登录
              </Button>
            )}
          </div>
        </div>
      </header>

      {shopSlug && (
        <CartDrawer
          shopSlug={shopSlug}
          open={cartOpen}
          onOpenChange={setCartOpen}
        />
      )}
    </>
  );
}
