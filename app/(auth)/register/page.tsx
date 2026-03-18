"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Store, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

// ─── Country prefix config ────────────────────────────────────────────────────
const COUNTRIES = [
  {
    code: "MY",
    label: "Malaysia",
    prefix: "+60",
    flag: "🇲🇾",
    placeholder: "1XXXXXXXXX",
    // MY: starts with 1, total local digits 9 or 10
    validate: (n: string) => /^1\d{8,9}$/.test(n),
    errorMsg: "格式错误",
  },
  {
    code: "CN",
    label: "China",
    prefix: "+86",
    flag: "🇨🇳",
    placeholder: "1XXXXXXXXXX",
    // CN: starts with 1[3-9], total 11 digits
    validate: (n: string) => /^1[3-9]\d{9}$/.test(n),
    errorMsg: "格式错误",
  },
  {
    code: "SG",
    label: "Singapore",
    prefix: "+65",
    flag: "🇸🇬",
    placeholder: "8XXXXXXX",
    // SG: starts with 8 or 9, total 8 digits
    validate: (n: string) => /^[89]\d{7}$/.test(n),
    errorMsg: "格式错误",
  },
] as const;

type CountryCode = (typeof COUNTRIES)[number]["code"];

// ─── Component ────────────────────────────────────────────────────────────────
export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [countryCode, setCountryCode] = useState<CountryCode>("MY");
  const [localNumber, setLocalNumber] = useState("");
  const [form, setForm] = useState({
    name: "",
    password: "",
    confirmPassword: "",
  });

  const country = COUNTRIES.find((c) => c.code === countryCode)!;

  const handleLocalNumberChange = (val: string) => {
    // Only allow digits
    const digits = val.replace(/\D/g, "");
    setLocalNumber(digits);
  };

  // Derived validation states
  const isPhoneTouched = localNumber.length > 0;
  const isPhoneValid = isPhoneTouched && country.validate(localNumber);
  const isPasswordMatch =
    form.password.length > 0 && form.confirmPassword.length > 0
      ? form.password === form.confirmPassword
      : null;

  const fullPhone = `${country.prefix}${localNumber}`;

  const handleRegister = async () => {
    if (!form.name.trim()) {
      toast.error("请填写姓名");
      return;
    }
    if (!isPhoneValid) {
      toast.error(`手机号格式错误：${country.errorMsg}`);
      return;
    }
    if (form.password.length < 6) {
      toast.error("密码至少需要 6 位");
      return;
    }
    if (form.password !== form.confirmPassword) {
      toast.error("两次密码输入不一致");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          phone: fullPhone,
          password: form.password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? "注册失败，请重试");
        return;
      }

      toast.success("注册成功！请登录");
      router.push("/login");
    } catch {
      toast.error("网络错误，请重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm space-y-6">

        {/* Logo */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center bg-red-950 p-3 rounded-2xl">
            <Store className="h-8 w-8 text-red-300" />
          </div>
          <h1 className="text-2xl font-bold">万事通</h1>
          <p className="text-sm text-muted-foreground">创建您的账号</p>
        </div>

        <Card>
          <CardContent className="pt-6 space-y-4">

            {/* Name */}
            <div className="space-y-1.5">
              <Label htmlFor="name">姓名</Label>
              <Input
                id="name"
                placeholder="请输入您的姓名"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>

            {/* Phone with country prefix */}
            <div className="space-y-1.5">
              <Label>手机号码</Label>
              <div className="flex gap-2">
                {/* Country selector */}
                <Select
                  value={countryCode}
                  onValueChange={(v) => {
                    setCountryCode(v as CountryCode);
                    setLocalNumber(""); // reset on country change
                  }}
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

                {/* Local number input */}
                <div className="relative flex-1">
                  <Input
                    placeholder={country.placeholder}
                    value={localNumber}
                    onChange={(e) => handleLocalNumberChange(e.target.value)}
                    inputMode="numeric"
                    className={
                      isPhoneTouched
                        ? isPhoneValid
                          ? "border-green-500 pr-9 focus-visible:ring-green-500/20"
                          : "border-destructive pr-9 focus-visible:ring-destructive/20"
                        : ""
                    }
                  />
                  {isPhoneTouched && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                      {isPhoneValid ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-destructive" />
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* error message */}
              <div className="flex items-center justify-between px-0.5">
                {isPhoneTouched && !isPhoneValid && (
                  <p className="text-xs text-destructive">{country.errorMsg}</p>
                )}
              </div>

              {/* Preview of full number */}
              {isPhoneValid && (
                <p className="text-xs text-green-600 font-mono bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 px-3 py-1.5 rounded-md">
                  完整号码：{fullPhone}
                </p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <Label htmlFor="password">密码</Label>
              <Input
                id="password"
                type="password"
                placeholder="至少 6 位"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              />
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword">确认密码</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="再次输入密码"
                  value={form.confirmPassword}
                  onChange={(e) => setForm((f) => ({ ...f, confirmPassword: e.target.value }))}
                  className={
                    isPasswordMatch !== null
                      ? isPasswordMatch
                        ? "border-green-500 pr-9 focus-visible:ring-green-500/20"
                        : "border-destructive pr-9 focus-visible:ring-destructive/20"
                      : ""
                  }
                  onKeyDown={(e) => e.key === "Enter" && handleRegister()}
                />
                {isPasswordMatch !== null && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    {isPasswordMatch ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-destructive" />
                    )}
                  </div>
                )}
              </div>
              {isPasswordMatch === false && (
                <p className="text-xs text-destructive px-0.5">两次密码不一致</p>
              )}
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