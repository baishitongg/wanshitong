"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Store, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ phone: "", password: "" });

  const handleLogin = async () => {
    if (!form.phone || !form.password) {
      toast.error("请填写手机号码和密码");
      return;
    }
    setLoading(true);
    const res = await signIn("credentials", {
      phone: form.phone,
      password: form.password,
      redirect: false,
    });

    if (res?.error) {
      toast.error("手机号码或密码错误");
    } else {
      toast.success("登录成功！");
      router.push("/");
      router.refresh();
    }
    setLoading(false);
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
          <p className="text-sm text-muted-foreground">登录您的账号</p>
        </div>

        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="phone">手机号码</Label>
              <Input
                id="phone"
                placeholder="请输入手机号码"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">密码</Label>
              <Input
                id="password"
                type="password"
                placeholder="请输入密码"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              />
            </div>
            <Button
              className="w-full bg-red-700 hover:bg-red-600 text-white"
              onClick={handleLogin}
              disabled={loading}
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              登录
            </Button>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground">
          还没有账号？{" "}
          <Link href="/register" className="text-red-600 hover:underline font-medium">
            立即注册
          </Link>
        </p>
      </div>
    </div>
  );
}