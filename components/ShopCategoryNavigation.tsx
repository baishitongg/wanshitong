"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronDown, Grid2x2 } from "lucide-react";
import {
  buildCategoryTree,
  getCategoryAncestors,
  type CategoryNode,
} from "@/lib/categories";
import { buildShopHref } from "@/lib/shops";
import { withAlpha, type ShopTheme } from "@/lib/shopTheme";
import type { Category } from "@/types";

interface Props {
  shopSlug: string;
  categories: Category[];
  currentCategoryId?: string;
  theme?: ShopTheme;
  stickyDesktop?: boolean;
  narrow?: boolean;
}

type FlatCategory = {
  node: CategoryNode<NavigationCategory>;
  depth: number;
};

type NavigationCategory = Pick<Category, "id" | "name" | "parentId" | "sortOrder">;

function flattenNodes(
  nodes: CategoryNode<NavigationCategory>[],
  depth = 0,
): FlatCategory[] {
  return nodes.flatMap((node) => [
    { node, depth },
    ...flattenNodes(node.children, depth + 1),
  ]);
}

function getCategoryHref(shopSlug: string, categoryId?: string) {
  return categoryId
    ? buildShopHref(shopSlug, `/category/${categoryId}`)
    : buildShopHref(shopSlug);
}

function getButtonStyle(isActive: boolean, color: string) {
  return isActive
    ? {
        backgroundColor: color,
        borderColor: color,
        color: "#ffffff",
      }
    : {
        borderColor: withAlpha(color, 0.22),
        color,
      };
}

type MobileBranchProps = {
  node: CategoryNode<NavigationCategory>;
  shopSlug: string;
  currentCategoryId?: string;
  branchIds: Set<string>;
  openIds: Set<string>;
  themeColor: string;
  level?: number;
  onToggle: (categoryId: string) => void;
  onNavigate: () => void;
};

function MobileCategoryBranch({
  node,
  shopSlug,
  currentCategoryId,
  branchIds,
  openIds,
  themeColor,
  level = 0,
  onToggle,
  onNavigate,
}: MobileBranchProps) {
  const hasChildren = node.children.length > 0;
  const isCurrent = currentCategoryId === node.id;
  const isInCurrentBranch = branchIds.has(node.id);
  const isOpen = openIds.has(node.id);
  const leftPadding = 12 + level * 12;

  if (!hasChildren) {
    return (
      <Link
        href={getCategoryHref(shopSlug, node.id)}
        className="block rounded-md py-2.5 pr-3 text-sm font-medium transition-colors hover:bg-muted"
        style={{
          paddingLeft: leftPadding,
          color: isCurrent ? themeColor : undefined,
        }}
        onClick={onNavigate}
      >
        {node.name}
      </Link>
    );
  }

  return (
    <div>
      <button
        type="button"
        className="flex w-full items-center justify-between rounded-md py-2.5 pr-3 text-left text-sm font-medium transition-colors hover:bg-muted"
        style={{
          paddingLeft: leftPadding,
          color: isInCurrentBranch ? themeColor : undefined,
        }}
        onClick={() => onToggle(node.id)}
        aria-expanded={isOpen}
      >
        <span>{node.name}</span>
        <ChevronDown
          className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div
          className="ml-3 border-l pl-2"
          style={{ borderColor: withAlpha(themeColor, 0.18) }}
        >
          <Link
            href={getCategoryHref(shopSlug, node.id)}
            className="block rounded-md px-3 py-2 text-sm transition-colors hover:bg-muted"
            style={{ color: isCurrent ? themeColor : undefined }}
            onClick={onNavigate}
          >
            全部{node.name}
          </Link>

          {node.children.map((child) => (
            <MobileCategoryBranch
              key={child.id}
              node={child}
              shopSlug={shopSlug}
              currentCategoryId={currentCategoryId}
              branchIds={branchIds}
              openIds={openIds}
              themeColor={themeColor}
              level={level + 1}
              onToggle={onToggle}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ShopCategoryNavigation({
  shopSlug,
  categories,
  currentCategoryId,
  theme,
  stickyDesktop = false,
  narrow = false,
}: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [manualOpenIds, setManualOpenIds] = useState<string[]>([]);
  const [desktopOpenRootId, setDesktopOpenRootId] = useState<string | null>(null);

  const themeColor = theme?.secondary ?? "#b91c1c";
  const categoryItems = useMemo(
    () =>
      categories.map(({ id, name, parentId, sortOrder }) => ({
        id,
        name,
        parentId,
        sortOrder,
      })),
    [categories],
  );
  const rootNodes = useMemo(() => buildCategoryTree(categoryItems), [categoryItems]);
  const ancestors = useMemo(
    () =>
      currentCategoryId
        ? getCategoryAncestors(categoryItems, currentCategoryId)
        : [],
    [categoryItems, currentCategoryId],
  );
  const branchIds = useMemo(
    () => {
      const ids = ancestors.map((item) => item.id);
      if (currentCategoryId) ids.push(currentCategoryId);
      return new Set(ids);
    },
    [ancestors, currentCategoryId],
  );
  const routeOpenIds = useMemo(
    () => [
      ...ancestors.map((item) => item.id),
      ...(currentCategoryId ? [currentCategoryId] : []),
    ],
    [ancestors, currentCategoryId],
  );
  const openIds = useMemo(
    () => new Set([...routeOpenIds, ...manualOpenIds]),
    [manualOpenIds, routeOpenIds],
  );
  const currentCategory = useMemo(
    () =>
      currentCategoryId
        ? categories.find((category) => category.id === currentCategoryId)
        : null,
    [categories, currentCategoryId],
  );
  const currentRootId = ancestors[0]?.id ?? currentCategoryId ?? null;
  const activeDesktopRootId = desktopOpenRootId ?? currentRootId;
  const activeDesktopRoot = useMemo(
    () => rootNodes.find((node) => node.id === activeDesktopRootId) ?? null,
    [activeDesktopRootId, rootNodes],
  );
  const desktopSubcategories = useMemo(
    () => (activeDesktopRoot ? flattenNodes(activeDesktopRoot.children) : []),
    [activeDesktopRoot],
  );

  if (!categories.length) return null;

  const containerClass = `container mx-auto px-6 md:px-20 ${narrow ? "max-w-5xl" : ""}`;

  const toggleCategory = (categoryId: string) => {
    setManualOpenIds((ids) =>
      ids.includes(categoryId)
        ? ids.filter((id) => id !== categoryId)
        : [...ids, categoryId],
    );
  };

  return (
    <>
      <div className="sticky top-16 z-30 border-b border-border bg-background md:hidden">
        <div className={`${containerClass} py-3`}>
          <button
            type="button"
            onClick={() => setMobileOpen((open) => !open)}
            className="flex w-full items-center justify-between rounded-md border border-border bg-white px-4 py-3 text-sm font-medium shadow-sm"
            aria-expanded={mobileOpen}
          >
            <span className="flex items-center gap-2 text-foreground">
              <Grid2x2 className="h-4 w-4" style={{ color: themeColor }} />
              选择分类
            </span>

            <span className="flex min-w-0 items-center gap-2 text-muted-foreground">
              <span className="truncate text-xs">
                {currentCategory?.name ?? "请选择你要的分类"}
              </span>
              <ChevronDown
                className={`h-4 w-4 flex-shrink-0 transition-transform ${
                  mobileOpen ? "rotate-180" : ""
                }`}
              />
            </span>
          </button>

          {mobileOpen && (
            <div className="mt-2 max-h-80 overflow-y-auto rounded-md border border-border bg-background p-2 shadow-md">
              <Link
                href={getCategoryHref(shopSlug)}
                className="block rounded-md px-3 py-2.5 text-sm font-medium transition-colors hover:bg-muted"
                style={{ color: !currentCategoryId ? themeColor : undefined }}
                onClick={() => setMobileOpen(false)}
              >
                全部分类
              </Link>

              {rootNodes.map((node) => (
                <MobileCategoryBranch
                  key={node.id}
                  node={node}
                  shopSlug={shopSlug}
                  currentCategoryId={currentCategoryId}
                  branchIds={branchIds}
                  openIds={openIds}
                  themeColor={themeColor}
                  onToggle={toggleCategory}
                  onNavigate={() => setMobileOpen(false)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <div
        className={`hidden border-b border-border bg-background/95 backdrop-blur-sm md:block ${
          stickyDesktop ? "sticky top-16 z-30" : ""
        }`}
      >
        <div className={`${containerClass} py-3`}>
          <div className="flex items-center gap-3 overflow-x-auto whitespace-nowrap no-scrollbar">
            <span className="flex-shrink-0 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              分类
            </span>

            <Link
              href={getCategoryHref(shopSlug)}
              className="inline-flex flex-shrink-0 items-center rounded-md border px-3 py-1.5 text-sm font-medium transition-all"
              style={getButtonStyle(!currentCategoryId && !desktopOpenRootId, themeColor)}
            >
              全部分类
            </Link>

            {rootNodes.map((node) => {
              const isBranchActive = currentRootId === node.id;
              const isOpen = activeDesktopRootId === node.id;

              if (node.children.length === 0) {
                return (
                  <Link
                    key={node.id}
                    href={getCategoryHref(shopSlug, node.id)}
                    className="inline-flex flex-shrink-0 items-center rounded-md border px-3 py-1.5 text-sm font-medium transition-all"
                    style={getButtonStyle(currentCategoryId === node.id, themeColor)}
                  >
                    {node.name}
                  </Link>
                );
              }

              return (
                <button
                  key={node.id}
                  type="button"
                  className="inline-flex flex-shrink-0 items-center gap-1 rounded-md border px-3 py-1.5 text-sm font-medium transition-all"
                  style={getButtonStyle(isBranchActive || isOpen, themeColor)}
                  onClick={() =>
                    setDesktopOpenRootId((id) => (id === node.id ? null : node.id))
                  }
                  aria-expanded={isOpen}
                >
                  {node.name}
                  <ChevronDown
                    className={`h-3.5 w-3.5 transition-transform ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
              );
            })}
          </div>
        </div>

        {activeDesktopRoot && desktopSubcategories.length > 0 && (
          <div
            className="border-t"
            style={{ borderColor: withAlpha(themeColor, 0.14) }}
          >
            <div className={`${containerClass} flex flex-wrap gap-2 py-3`}>
              <Link
                href={getCategoryHref(shopSlug, activeDesktopRoot.id)}
                className="inline-flex items-center rounded-md border px-3 py-1.5 text-sm font-medium transition-all"
                style={getButtonStyle(currentCategoryId === activeDesktopRoot.id, themeColor)}
              >
                全部{activeDesktopRoot.name}
              </Link>

              {desktopSubcategories.map(({ node, depth }) => (
                <Link
                  key={node.id}
                  href={getCategoryHref(shopSlug, node.id)}
                  className="inline-flex items-center rounded-md border px-3 py-1.5 text-sm font-medium transition-all"
                  style={getButtonStyle(currentCategoryId === node.id, themeColor)}
                >
                  {"-".repeat(depth)}
                  {depth > 0 ? " " : ""}
                  {node.name}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
