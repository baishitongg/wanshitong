"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSession, signIn, signOut, useSession } from "next-auth/react";

type SessionUser = {
  role?: string;
};

export default function AdminLoginPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const user = session?.user as SessionUser | undefined;

  useEffect(() => {
    if (status === "authenticated") {
      const role = String(user?.role ?? "").toUpperCase();

      if (role === "ADMIN") {
        router.replace("/admin/dashboard");
      } else {
        router.replace("/");
      }
    }
  }, [status, user?.role, router]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    const result = await signIn("credentials", {
      phone: phone.trim(),
      password,
      redirect: false,
    });

    if (!result || result.error) {
      setSubmitting(false);
      setError("手机号码或密码错误。");
      return;
    }

    const latestSession = await getSession();
    const latestUser = latestSession?.user as SessionUser | undefined;
    const role = String(latestUser?.role ?? "").toUpperCase();

    if (role !== "ADMIN") {
      await signOut({ redirect: false });
      setSubmitting(false);
      setError("此账号不是管理员，无法进入后台。");
      return;
    }

    setSubmitting(false);
    router.replace("/admin/dashboard");
    router.refresh();
  };

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-sm text-gray-500">加载中...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-gray-900">管理员登录</h1>
          <p className="mt-2 text-sm text-gray-500">
            请输入管理员账号以进入后台报表页面
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="phone"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              手机号码
            </label>
            <input
              id="phone"
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="请输入手机号码"
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-black"
              required
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              密码
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入密码"
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-black"
              required
            />
          </div>

          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-black px-4 py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "登录中..." : "登录"}
          </button>
        </form>
      </div>
    </div>
  );
}
