"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ProductCard from "@/components/ProductCard";
import type { Product, Category } from "@/types";

const PER_PAGE = 8;

interface Props {
  products: Product[];
  categories: Category[];
  hideCategoryPills?: boolean;
  hideCategoryPillsOnMobile?: boolean;
  defaultSearch?: string;
}

export default function ProductGridWithFilter({
  products,
  categories,
  hideCategoryPills = false,
  defaultSearch = "",
}: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [selectedCategory, setSelectedCategory] = useState<string>(
    searchParams.get("category") ?? "ALL"
  );
  const [search, setSearch] = useState(defaultSearch);
  const [page, setPage] = useState(1);

  const active = products.filter((p) => p.status);

  const handleCategoryChange = (id: string) => {
    setSelectedCategory(id);
    setPage(1);
    const params = new URLSearchParams(searchParams.toString());
    if (id === "ALL") params.delete("category");
    else params.set("category", id);
    const query = params.toString();
    router.replace(`${pathname}${query ? `?${query}` : ""}`, { scroll: false });
  };

  const handleSearch = (val: string) => {
    setSearch(val);
    setPage(1);
  };

  const filtered = useMemo(() => {
    let list = active;
    if (selectedCategory !== "ALL") {
      list = list.filter((p) => p.categoryId === selectedCategory);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.description ?? "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [active, selectedCategory, search]);

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const slice = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const currentCategoryName =
    selectedCategory === "ALL"
      ? null
      : categories.find((c) => c.id === selectedCategory)?.name ?? null;

  return (
    <div className="space-y-6">
      {/* Header */}
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

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            className="pl-9 pr-8 h-9 text-sm"
            placeholder="搜索商品..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
          />
          {search && (
            <button
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => handleSearch("")}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Empty state */}
      {filtered.length === 0 ? (
        <div className="py-20 text-center text-muted-foreground space-y-2">
          <p className="text-lg font-medium">没有找到相关商品</p>
          <p className="text-sm">
            {search ? (
              <>
                没有与「{search}」匹配的结果，{" "}
                <button
                  className="text-red-600 hover:underline"
                  onClick={() => handleSearch("")}
                >
                  清除搜索
                </button>
              </>
            ) : (
              <>
                该分类暂无商品，{" "}
                <button
                  className="text-red-600 hover:underline"
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
            {slice.map((p) => (
              <Link key={p.id} href={`/product/${p.id}`} className="block">
                <ProductCard {...p} mode="buyer" />
              </Link>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-10">
              <Button
                variant="outline" size="sm" className="h-9 w-9 p-0"
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <Button
                  key={p}
                  variant={page === p ? "default" : "outline"}
                  size="sm"
                  className={`h-9 w-9 p-0 ${page === p ? "bg-red-700 hover:bg-red-600 border-0" : ""}`}
                  onClick={() => setPage(p)}
                >
                  {p}
                </Button>
              ))}
              <Button
                variant="outline" size="sm" className="h-9 w-9 p-0"
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
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