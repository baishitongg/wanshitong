"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";

type AdminNavTab = "analytics" | "orders" | "shops" | "staff";

interface AdminNavProps {
  active: AdminNavTab;
}

const tabs: Array<{
  key: AdminNavTab;
  href: string;
  label: string;
}> = [
  { key: "analytics", href: "/admin", label: "数据分析" },
  { key: "orders", href: "/admin/orders", label: "订单处理" },
  { key: "shops", href: "/admin/shops", label: "店铺管理" },
  { key: "staff", href: "/admin/staff", label: "员工账号" },
];

export default function AdminNav({ active }: AdminNavProps) {
  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/admin/login" });
  };

  return (
    <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">管理后台</h1>
        <p className="mt-2 text-sm text-gray-500">
          数据分析、订单处理、店铺管理与员工账号分开处理，更清晰也更方便。
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {tabs.map((tab) => (
          <Link
            key={tab.key}
            href={tab.href}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
              active === tab.key
                ? "bg-black text-white"
                : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
            }`}
          >
            {tab.label}
          </Link>
        ))}

        <button
          type="button"
          onClick={handleSignOut}
          className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
        >
          登出
        </button>
      </div>
    </div>
  );
}
