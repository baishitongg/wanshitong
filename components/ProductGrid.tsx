"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import ProductCard from "@/components/ProductCard";
import type { Product } from "@/types";

const PER_PAGE = 8;

export default function ProductGrid({ products }: { products: Product[] }) {
  const active = products.filter((p) => p.status);
  const [page, setPage] = useState(1);
  const totalPages = Math.ceil(active.length / PER_PAGE);
  const slice = active.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">全部商品</h2>
        <span className="text-sm text-muted-foreground">共 {active.length} 件商品</span>
      </div>

      {active.length === 0 ? (
        <div className="py-20 text-center text-muted-foreground">
          <p>暂无商品，敬请期待。</p>
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
                variant="outline"
                size="sm"
                className="h-9 w-9 p-0"
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
                  className={`h-9 w-9 p-0 ${page === p ? "bg-green-600 hover:bg-green-700 border-0" : ""}`}
                  onClick={() => setPage(p)}
                >
                  {p}
                </Button>
              ))}

              <Button
                variant="outline"
                size="sm"
                className="h-9 w-9 p-0"
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