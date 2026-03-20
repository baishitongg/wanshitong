"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, Grid2x2 } from "lucide-react";
import { buildShopHref } from "@/lib/shops";

interface Category {
  id: string;
  name: string;
}

interface Props {
  shopSlug: string;
  categories: Category[];
}

export default function MobileCategoryDropdown({ shopSlug, categories }: Props) {
  const [open, setOpen] = useState(false);

  if (!categories.length) return null;

  return (
    <div className="md:hidden border-b border-border bg-background sticky top-16 z-30">
      <div className="px-4 py-3">
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="w-full flex items-center justify-between rounded-xl border border-border bg-white px-4 py-3 text-sm font-medium shadow-sm"
        >
          <span className="flex items-center gap-2 text-foreground">
            <Grid2x2 className="h-4 w-4 text-red-600" />
            选择分类
          </span>

          <span className="flex items-center gap-2 text-muted-foreground">
            <span className="text-xs">请选择你要的分类</span>
            <ChevronDown
              className={`h-4 w-4 transition-transform ${
                open ? "rotate-180" : ""
              }`}
            />
          </span>
        </button>

        {open && (
          <div className="mt-3 rounded-2xl border border-border bg-background shadow-md overflow-hidden">
            <div className="max-h-72 overflow-y-auto p-2">
              <Link
                href={buildShopHref(shopSlug)}
                className="block rounded-xl px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition"
                onClick={() => setOpen(false)}
              >
                全部分类
              </Link>

              <div className="mt-1 grid grid-cols-1 gap-1">
                {categories.map((cat) => (
                  <Link
                    key={cat.id}
                    href={buildShopHref(shopSlug, `/category/${cat.id}`)}
                    className="block rounded-xl px-3 py-2 text-sm text-foreground hover:bg-muted transition"
                    onClick={() => setOpen(false)}
                  >
                    {cat.name}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
