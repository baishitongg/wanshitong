"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Store, Loader2 } from "lucide-react";
import { toast } from "sonner";

const COUNTRIES = [
  { code: "MY", label: "Malaysia",  prefix: "+60", flag: "🇲🇾" },
  { code: "CN", label: "China",     prefix: "+86", flag: "🇨🇳" },
  { code: "SG", label: "Singapore", prefix: "+65", flag: "🇸🇬" },
] as const;
type CountryCode = (typeof COUNTRIES)[number]["code"];

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [countryCode, setCountryCode] = useState<CountryCode>("MY");
  const [localNumber, setLocalNumber] = useState("");
  const [password, setPassword] = useState("");

  const country = COUNTRIES.find((c) => c.code === countryCode)!;
  const fullPhone = `${country.prefix}${localNumber.replace(/\D/g, "")}`;

  const handleLogin = async () => {
    if (!localNumber || !password) {
      toast.error("请填写手机号码和密码");
      return;
    }
    setLoading(true);

    const res = await signIn("credentials", {
      phone: fullPhone,
      password,
      redirect: false,
    });

    if (res?.error) {
      toast.error("手机号码或密码错误");
      setLoading(false);
      return;
    }

    // Check role — block staff from using customer login
    const sessionRes = await fetch("/api/auth/session");
    const session = await sessionRes.json();
    const role = session?.user?.role;

    if (role === "STAFF") {
      await fetch("/api/auth/signout", { method: "POST" });
      toast.error("员工账号请使用员工登录入口");
      setLoading(false);
      return;
    }

    toast.success("登录成功！");
    router.push("/");
    router.refresh();
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center bg-red-950 p-3 rounded-2xl">
            <Store className="h-8 w-8 text-red-300" />
          </div>
          <h1 className="text-2xl font-bold">万事通</h1>
          <p className="text-sm text-muted-foreground">顾客登录</p>
        </div>

        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-1.5">
              <Label>手机号码</Label>
              <div className="flex gap-2">
                <Select
                  value={countryCode}
                  onValueChange={(v) => { setCountryCode(v as CountryCode); setLocalNumber(""); }}
                >
                  <SelectTrigger className="w-[130px] flex-shrink-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        <span className="flex items-center gap-2">
                          <span>{c.flag}</span>
                          <span className="font-mono">{c.prefix}</span>
                          <span className="text-muted-foreground text-xs">{c.label}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="请输入手机号码"
                  value={localNumber}
                  onChange={(e) => setLocalNumber(e.target.value.replace(/\D/g, ""))}
                  inputMode="numeric"
                  className="flex-1"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">密码</Label>
              <Input
                id="password"
                type="password"
                placeholder="请输入密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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