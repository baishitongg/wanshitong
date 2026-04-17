export type CategoryLike = {
  id: string;
  name: string;
  parentId?: string | null;
  sortOrder?: number | null;
};

export type CategoryNode<T extends CategoryLike = CategoryLike> = T & {
  children: CategoryNode<T>[];
};

export type CategoryOption<T extends CategoryLike = CategoryLike> = T & {
  depth: number;
  label: string;
  hasChildren: boolean;
};

function compareCategory(a: CategoryLike, b: CategoryLike) {
  const orderA = a.sortOrder ?? 0;
  const orderB = b.sortOrder ?? 0;

  if (orderA !== orderB) return orderA - orderB;
  return a.name.localeCompare(b.name);
}

export function normalizeCategorySlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function buildCategoryTree<T extends CategoryLike>(
  categories: T[],
): CategoryNode<T>[] {
  const nodeMap = new Map<string, CategoryNode<T>>();
  const roots: CategoryNode<T>[] = [];

  categories.forEach((category) => {
    nodeMap.set(category.id, { ...category, children: [] });
  });

  nodeMap.forEach((node) => {
    const parent = node.parentId ? nodeMap.get(node.parentId) : null;
    if (parent) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  });

  const sortNodes = (nodes: CategoryNode<T>[]) => {
    nodes.sort(compareCategory);
    nodes.forEach((node) => sortNodes(node.children));
  };

  sortNodes(roots);
  return roots;
}

export function flattenCategoryTree<T extends CategoryLike>(
  categories: T[],
): CategoryOption<T>[] {
  const output: CategoryOption<T>[] = [];

  const visit = (node: CategoryNode<T>, depth: number) => {
    const { children, ...category } = node;
    output.push({
      ...(category as unknown as T),
      depth,
      label: `${"-".repeat(depth)}${depth > 0 ? " " : ""}${category.name}`,
      hasChildren: children.length > 0,
    });
    children.forEach((child) => visit(child, depth + 1));
  };

  buildCategoryTree(categories).forEach((node) => visit(node, 0));
  return output;
}

export function getCategoryAndDescendantIds(
  categories: CategoryLike[],
  categoryId: string,
) {
  const childMap = new Map<string, string[]>();

  categories.forEach((category) => {
    if (!category.parentId) return;
    const children = childMap.get(category.parentId) ?? [];
    children.push(category.id);
    childMap.set(category.parentId, children);
  });

  const ids = new Set<string>();
  const visit = (id: string) => {
    ids.add(id);
    (childMap.get(id) ?? []).forEach(visit);
  };

  visit(categoryId);
  return [...ids];
}

export function getCategoryAncestors<T extends CategoryLike>(
  categories: T[],
  categoryId: string,
) {
  const categoryMap = new Map(categories.map((category) => [category.id, category]));
  const ancestors: T[] = [];
  let current = categoryMap.get(categoryId);

  while (current?.parentId) {
    const parent = categoryMap.get(current.parentId);
    if (!parent) break;
    ancestors.unshift(parent);
    current = parent;
  }

  return ancestors;
}
