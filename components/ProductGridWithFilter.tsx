"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ProductCard from "@/components/ProductCard";
import type { Product, Category } from "@/types";
import {
  flattenCategoryTree,
  getCategoryAndDescendantIds,
} from "@/lib/categories";
import { buildShopHref } from "@/lib/shops";
import type { ShopTheme } from "@/lib/shopTheme";

const PER_PAGE = 8;

interface Props {
  shopSlug: string;
  products: Product[];
  categories: Category[];
  hideCategoryPills?: boolean;
  defaultSearch?: string;
  theme?: ShopTheme;
}

export default function ProductGridWithFilter({
  shopSlug,
  products,
  categories,
  hideCategoryPills = false,
  defaultSearch = "",
  theme,
}: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [selectedCategory, setSelectedCategory] = useState<string>(
    searchParams.get("category") ?? "ALL",
  );
  const [search, setSearch] = useState(defaultSearch);
  const [page, setPage] = useState(1);

  const active = useMemo(
    () => products.filter((product) => product.status),
    [products],
  );
  const categoryOptions = useMemo(() => flattenCategoryTree(categories), [categories]);
  const selectedCategoryIds = useMemo(
    () =>
      selectedCategory === "ALL"
        ? []
        : getCategoryAndDescendantIds(categories, selectedCategory),
    [categories, selectedCategory],
  );

  useEffect(() => {
    const imageUrls = active
      .map((product) => product.imageUrl)
      .filter((url): url is string => Boolean(url))
      .slice(0, 24);

    if (imageUrls.length === 0) return;

    const preload = () => {
      imageUrls.forEach((url) => {
        const link = document.createElement("link");
        link.rel = "prefetch";
        link.as = "image";
        link.href = url;
        document.head.appendChild(link);
      });
    };

    const browserWindow = window as Window & {
      requestIdleCallback?: (callback: () => void) => number;
      cancelIdleCallback?: (handle: number) => void;
    };

    const idleCallback = browserWindow.requestIdleCallback
      ? browserWindow.requestIdleCallback(preload)
      : globalThis.setTimeout(preload, 600);

    return () => {
      if (browserWindow.cancelIdleCallback && typeof idleCallback === "number") {
        browserWindow.cancelIdleCallback(idleCallback);
      } else {
        globalThis.clearTimeout(idleCallback);
      }
    };
  }, [active]);

  const handleCategoryChange = (id: string) => {
    setSelectedCategory(id);
    setPage(1);
    const params = new URLSearchParams(searchParams.toString());
    if (id === "ALL") params.delete("category");
    else params.set("category", id);
    const query = params.toString();
    router.replace(`${pathname}${query ? `?${query}` : ""}`, { scroll: false });
  };

  const filtered = useMemo(() => {
    let list = active;
    if (selectedCategory !== "ALL") {
      list = list.filter((product) => selectedCategoryIds.includes(product.categoryId));
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (product) =>
          product.name.toLowerCase().includes(q) ||
          (product.description ?? "").toLowerCase().includes(q),
      );
    }
    return list;
  }, [active, selectedCategory, selectedCategoryIds, search]);

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const slice = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const currentCategoryName =
    selectedCategory === "ALL"
      ? null
      : categoryOptions.find((category) => category.id === selectedCategory)?.name ??
        null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">
            {currentCategoryName ?? "全部商品"}
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {selectedCategory === "ALL" && !search.trim()
              ? `共 ${active.length} 件商品`
              : `找到 ${filtered.length} 件商品`}
          </p>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            className="pl-9 pr-8 h-9 text-sm"
            placeholder="搜索商品..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          {search && (
            <button
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => {
                setSearch("");
                setPage(1);
              }}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {!hideCategoryPills && categories.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => handleCategoryChange("ALL")}
            className={`rounded-full border px-3 py-1 text-xs transition-colors ${
              selectedCategory === "ALL"
                ? "text-white"
                : "border-border text-muted-foreground hover:border-red-400 hover:text-foreground"
            }`}
            style={
              selectedCategory === "ALL"
                ? {
                    backgroundColor: theme?.secondary ?? "#b91c1c",
                    borderColor: theme?.secondary ?? "#b91c1c",
                  }
                : undefined
            }
          >
            全部分类
          </button>

          {categoryOptions.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => handleCategoryChange(category.id)}
              className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                selectedCategory === category.id
                  ? "text-white"
                  : "border-border text-muted-foreground hover:border-red-400 hover:text-foreground"
              }`}
              style={
                selectedCategory === category.id
                  ? {
                      backgroundColor: theme?.secondary ?? "#b91c1c",
                      borderColor: theme?.secondary ?? "#b91c1c",
                    }
                  : undefined
              }
            >
              {category.label}
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="py-20 text-center text-muted-foreground space-y-2">
          <p className="text-lg font-medium">没有找到相关商品</p>
          <p className="text-sm">
            {search ? (
              <>
                没有与“{search}”匹配的结果，
                <button
                  className="text-red-600 hover:underline"
                  style={{ color: theme?.secondary ?? "#dc2626" }}
                  onClick={() => {
                    setSearch("");
                    setPage(1);
                  }}
                >
                  清除搜索
                </button>
              </>
            ) : (
              <>
                该分类暂无商品，
                <button
                  className="text-red-600 hover:underline"
                  style={{ color: theme?.secondary ?? "#dc2626" }}
                  onClick={() => handleCategoryChange("ALL")}
                >
                  查看全部
                </button>
              </>
            )}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {slice.map((product, index) => (
              <Link
                key={product.id}
                href={buildShopHref(shopSlug, `/product/${product.id}`)}
                className="block"
              >
                <ProductCard
                  {...product}
                  shopSlug={shopSlug}
                  mode="buyer"
                  theme={theme}
                  imagePriority={index < 4}
                />
              </Link>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-10">
              <Button
                variant="outline"
                size="sm"
                className="h-9 w-9 p-0"
                onClick={() => setPage((value) => Math.max(value - 1, 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              {Array.from({ length: totalPages }, (_, index) => index + 1).map(
                (pageNumber) => (
                  <Button
                    key={pageNumber}
                    variant={page === pageNumber ? "default" : "outline"}
                    size="sm"
                    className={`h-9 w-9 p-0 ${
                      page === pageNumber
                        ? "border-0 text-white"
                        : ""
                    }`}
                    style={
                      page === pageNumber
                        ? { backgroundColor: theme?.secondary ?? "#b91c1c" }
                        : undefined
                    }
                    onClick={() => setPage(pageNumber)}
                  >
                    {pageNumber}
                  </Button>
                ),
              )}
              <Button
                variant="outline"
                size="sm"
                className="h-9 w-9 p-0"
                onClick={() => setPage((value) => Math.min(value + 1, totalPages))}
                disabled={page === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
