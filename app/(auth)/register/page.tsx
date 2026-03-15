"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Store, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  const handleRegister = async () => {
    if (!form.name || !form.phone || !form.password) {
      toast.error("请填写所有必填项");
      return;
    }
    if (form.password !== form.confirmPassword) {
      toast.error("两次输入的密码不一致");
      return;
    }
    if (form.password.length < 6) {
      toast.error("密码至少需要6位");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          phone: form.phone,
          password: form.password,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "注册失败");

      // Auto login after register
      const loginRes = await signIn("credentials", {
        phone: form.phone,
        password: form.password,
        redirect: false,
      });

      if (loginRes?.error) {
        toast.success("注册成功！请登录。");
        router.push("/login");
      } else {
        toast.success("注册成功，欢迎使用万事通！");
        router.push("/");
        router.refresh();
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Logo */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center bg-red-950 p-3 rounded-2xl">
            <Store className="h-8 w-8 text-red-300" />
          </div>
          <h1 className="text-2xl font-bold">万事通</h1>
          <p className="text-sm text-muted-foreground">创建您的新账号</p>
        </div>

        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">姓名 *</Label>
              <Input
                id="name"
                placeholder="请输入您的姓名"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">手机号码 *</Label>
              <Input
                id="phone"
                placeholder="请输入手机号码"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">密码 *</Label>
              <Input
                id="password"
                type="password"
                placeholder="至少6位"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm">确认密码 *</Label>
              <Input
                id="confirm"
                type="password"
                placeholder="再次输入密码"
                value={form.confirmPassword}
                onChange={(e) => setForm((f) => ({ ...f, confirmPassword: e.target.value }))}
                onKeyDown={(e) => e.key === "Enter" && handleRegister()}
              />
            </div>
            <Button
              className="w-full bg-red-700 hover:bg-red-600 text-white"
              onClick={handleRegister}
              disabled={loading}
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              注册
            </Button>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground">
          已有账号？{" "}
          <Link href="/login" className="text-red-600 hover:underline font-medium">
            立即登录
          </Link>
        </p>
      </div>
    </div>
  );
}