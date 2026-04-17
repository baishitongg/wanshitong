import Link from "next/link";
import { redirect } from "next/navigation";
import AdminNav from "@/components/AdminNav";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

type SessionUser = {
  role?: string;
  name?: string | null;
};

type PageProps = {
  searchParams?: Promise<{
    month?: string | string[];
    status?: string | string[];
    startDate?: string | string[];
    endDate?: string | string[];
  }>;
};

export const dynamic = "force-dynamic";

function getSingleValue(value?: string | string[]) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function getCurrentMonthValue() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function getMonthRange(monthValue: string) {
  const [yearStr, monthStr] = monthValue.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);

  if (!year || !month) {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return { start, end };
  }

  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);

  return { start, end };
}

function getCustomRange(startDate: string, endDate: string) {
  const result: { start?: Date; end?: Date } = {};

  if (startDate) {
    result.start = new Date(`${startDate}T00:00:00`);
  }

  if (endDate) {
    const end = new Date(`${endDate}T00:00:00`);
    end.setDate(end.getDate() + 1);
    result.end = end;
  }

  return result;
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "MYR",
  }).format(value);
}

function formatDateText(date: Date) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function getStatusText(status: string) {
  const s = String(status ?? "").toUpperCase();

  const map: Record<string, string> = {
    PENDING: "待处理",
    CONFIRMED: "已确认",
    PROCESSING: "处理中",
    DONE: "已完成",
    COMPLETED: "已完成",
    CANCELLED: "已取消",
    PAID: "已付款",
    DELIVERED: "已送达",
    FAILED: "失败",
  };

  return map[s] ?? s;
}

function getStatusBadgeClass(status: string) {
  const s = String(status ?? "").toUpperCase();

  if (["PAID", "COMPLETED", "DONE", "DELIVERED", "CONFIRMED"].includes(s)) {
    return "bg-green-100 text-green-700";
  }

  if (["PENDING", "PROCESSING"].includes(s)) {
    return "bg-yellow-100 text-yellow-700";
  }

  if (["CANCELLED", "FAILED"].includes(s)) {
    return "bg-red-100 text-red-700";
  }

  return "bg-gray-100 text-gray-700";
}

export default async function AdminPage({ searchParams }: PageProps) {
  const session = await auth();
  const user = session?.user as SessionUser | undefined;
  const role = String(user?.role ?? "").toUpperCase();

  if (!session || role !== "ADMIN") {
    redirect("/admin/login");
  }

  const params = (await searchParams) ?? {};

  const currentMonth = getCurrentMonthValue();
  const month = getSingleValue(params.month) || currentMonth;
  const status = String(getSingleValue(params.status) || "ALL").toUpperCase();
  const startDate = getSingleValue(params.startDate);
  const endDate = getSingleValue(params.endDate);

  const useCustomRange = Boolean(startDate || endDate);

  let rangeStart: Date | undefined;
  let rangeEnd: Date | undefined;
  let rangeLabel = "";

  if (useCustomRange) {
    const customRange = getCustomRange(startDate, endDate);
    rangeStart = customRange.start;
    rangeEnd = customRange.end;

    const startText = rangeStart ? formatDateText(rangeStart) : "不限开始日期";
    const endText = endDate
      ? formatDateText(new Date(`${endDate}T00:00:00`))
      : "不限结束日期";

    rangeLabel = `自定义期间：${startText} 至 ${endText}`;
  } else {
    const monthRange = getMonthRange(month);
    rangeStart = monthRange.start;
    rangeEnd = monthRange.end;

    const [year, monthOnly] = month.split("-");
    rangeLabel = `月份筛选：${year}年${Number(monthOnly)}月`;
  }

  const where: Prisma.OrderWhereInput = {};

  if (rangeStart || rangeEnd) {
    where.createdAt = {};
    if (rangeStart) where.createdAt.gte = rangeStart;
    if (rangeEnd) where.createdAt.lt = rangeEnd;
  }

  if (status !== "ALL") {
    const validStatuses = [
      "VERIFYING",
      "PROCESSING",
      "SHIPPED",
      "RECEIVED",
      "CANCELLED",
      "REFUND",
    ];

    if (validStatuses.includes(status)) {
      where.status = status as never;
    }
  }

  const [orders, allStatusRows, shops] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
    }),
    prisma.order.findMany({
      distinct: ["status"],
      select: {
        status: true,
      },
    }),
    prisma.shop.findMany({
      include: {
        _count: {
          select: {
            products: true,
            categories: true,
            orders: true,
            staffProfiles: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const totalOrders = orders.length;
  const totalAmount = orders.reduce(
    (sum, order) => sum + Number(order.totalAmount ?? 0),
    0,
  );
  const totalShops = shops.length;
  const activeShops = shops.filter((shop) => shop.status === "ACTIVE").length;
  const totalStaffAccounts = shops.reduce(
    (sum, shop) => sum + shop._count.staffProfiles,
    0,
  );

  const statusSummary = orders.reduce<Record<string, number>>((acc, order) => {
    const key = String(order.status ?? "UNKNOWN").toUpperCase();
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  const statusEntries = Object.entries(statusSummary).sort(
    (a, b) => b[1] - a[1],
  );

  const statusOptions = Array.from(
    new Set(
      allStatusRows
        .map((item) => String(item.status ?? "").toUpperCase())
        .filter(Boolean),
    ),
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-8">
      <div className="mx-auto max-w-7xl">
        <AdminNav active="analytics" />

        <div className="mb-6 rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">筛选条件</h2>

          <form
            action="/admin"
            method="GET"
            className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-5"
          >
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                按月份筛选
              </label>
              <input
                type="month"
                name="month"
                defaultValue={month}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                订单状态
              </label>
              <select
                name="status"
                defaultValue={status}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
              >
                <option value="ALL">全部状态</option>
                {statusOptions.map((item) => (
                  <option key={item} value={item}>
                    {getStatusText(item)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                自定义开始日期
              </label>
              <input
                type="date"
                name="startDate"
                defaultValue={startDate}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                自定义结束日期
              </label>
              <input
                type="date"
                name="endDate"
                defaultValue={endDate}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
              />
            </div>

            <div className="flex items-end gap-3">
              <button
                type="submit"
                className="w-full rounded-xl bg-black px-4 py-3 text-sm font-medium text-white transition hover:opacity-90"
              >
                套用筛选
              </button>

              <Link
                href="/admin"
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-center text-sm font-medium text-gray-700 transition hover:bg-gray-100"
              >
                重置
              </Link>
            </div>
          </form>

          <p className="mt-4 text-sm text-gray-500">
            提示：如果填写了自定义日期，系统会优先使用自定义期间。
          </p>
        </div>

        <div className="mb-6 rounded-2xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">当前报表范围</p>
          <p className="mt-2 text-lg font-semibold text-gray-900">
            {rangeLabel}
          </p>
          <p className="mt-1 text-sm text-gray-500">
            当前状态筛选：
            {status === "ALL" ? "全部状态" : getStatusText(status)}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-500">店铺总数</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">
              {totalShops}
            </p>
            <p className="mt-2 text-xs text-gray-500">
              启用中 {activeShops} 家店铺
            </p>
          </div>

          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-500">员工账号总数</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">
              {totalStaffAccounts}
            </p>
          </div>

          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-500">订单总数</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">
              {totalOrders}
            </p>
          </div>

          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-500">订单总金额</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">
              {formatMoney(totalAmount)}
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">状态分布</h2>

          {statusEntries.length === 0 ? (
            <p className="mt-4 text-sm text-gray-500">
              当前筛选条件下暂无订单数据。
            </p>
          ) : (
            <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {statusEntries.map(([itemStatus, count]) => (
                <div
                  key={itemStatus}
                  className="rounded-xl border border-gray-200 bg-gray-50 p-4"
                >
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusBadgeClass(
                      itemStatus,
                    )}`}
                  >
                    {getStatusText(itemStatus)}
                  </span>
                  <p className="mt-3 text-2xl font-bold text-gray-900">
                    {count}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
