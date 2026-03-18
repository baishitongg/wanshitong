"use client";

import Link from "next/link";
import { useSession, signIn, signOut } from "next-auth/react";
import { ShoppingCart, Store, LayoutDashboard, Settings, LogOut, LogIn, User, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useCartStore } from "@/lib/store/cartStore";
import CartDrawer from "@/components/CartDrawer";
import { useState } from "react";

export default function Navbar() {
  const { data: session } = useSession();
  const totalItems = useCartStore((s) => s.totalItems());
  const role = (session?.user as any)?.role;
  const [cartOpen, setCartOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-red-900/30 bg-red-950 text-white">
        <div className="container mx-auto px-6 md:px-20 flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 font-bold text-xl text-white">
            <Store className="h-6 w-6 text-red-300" />
            <span className="tracking-wide">万事通</span>
          </Link>

          {/* Nav links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            <Link href="/" className="text-red-200 hover:text-white transition-colors">
              中国超市
            </Link>
            {(role === "ASSISTANT" || role === "ADMIN" || role === "STAFF") && (
              <Link href="/staff/dashboard" className="text-red-200 hover:text-white transition-colors">
                订单管理
              </Link>
            )}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {/* Cart button */}
            <Button
              variant="ghost"
              size="icon"
              className="relative text-white hover:bg-red-900 hover:text-white"
              onClick={() => setCartOpen(true)}
            >
              <ShoppingCart className="h-5 w-5" />
              {totalItems > 0 && (
                <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs bg-yellow-400 text-red-950 border-0 font-bold">
                  {totalItems}
                </Badge>
              )}
            </Button>

            {/* Auth */}
            {session ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-9 w-9 rounded-full hover:bg-red-900">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={session.user?.image ?? ""} alt={session.user?.name ?? ""} />
                      <AvatarFallback className="bg-red-800 text-white text-sm font-semibold">
                        {session.user?.name?.charAt(0)?.toUpperCase() ?? "用"}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-medium">{session.user?.name ?? "用户"}</p>
                    <p className="text-xs text-muted-foreground">{(session.user as any)?.phone ?? ""}</p>
                  </div>
                  <DropdownMenuSeparator />

                  {/* Profile — only for customers */}
                  {(!role || role === "CUSTOMER") && (
                    <DropdownMenuItem asChild>
                      <Link href="/profile" className="flex items-center gap-2">
                        <User className="h-4 w-4" /> 我的账户
                      </Link>
                    </DropdownMenuItem>
                  )}
                  {(!role || role === "CUSTOMER") && (
                    <DropdownMenuItem asChild>
                      <Link href="/profile?tab=addresses" className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" /> 收货地址
                      </Link>
                    </DropdownMenuItem>
                  )}

                  {(role === "STAFF" || role === "ASSISTANT" || role === "ADMIN") && (
                    <DropdownMenuItem asChild>
                      <Link href="/staff/dashboard" className="flex items-center gap-2">
                        <LayoutDashboard className="h-4 w-4" /> 订单管理
                      </Link>
                    </DropdownMenuItem>
                  )}
                  {role === "ADMIN" && (
                    <DropdownMenuItem asChild>
                      <Link href="/admin" className="flex items-center gap-2">
                        <Settings className="h-4 w-4" /> 管理后台
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="text-red-600 focus:text-red-600"
                  >
                    <LogOut className="h-4 w-4 mr-2" /> 退出登录
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => signIn()}
                className="flex items-center gap-2 text-white hover:bg-red-900 hover:text-white border border-red-700"
              >
                <LogIn className="h-4 w-4" /> 登录
              </Button>
            )}
          </div>
        </div>
      </header>

      <CartDrawer open={cartOpen} onOpenChange={setCartOpen} />
    </>
  );
}