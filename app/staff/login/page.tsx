"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { ShieldCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function StaffLoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [staffId, setStaffId] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    if (!staffId || !password) {
      toast.error("请填写员工 ID 和密码");
      return;
    }
    setLoading(true);

    // staffId is stored in the phone field in DB
    const res = await signIn("credentials", {
      phone: staffId,
      password,
      redirect: false,
    });

    if (res?.error) {
      toast.error("员工 ID 或密码错误");
      setLoading(false);
      return;
    }

    // Block non-staff from using this login
    const sessionRes = await fetch("/api/auth/session");
    const session = await sessionRes.json();
    const role = session?.user?.role;

    if (role !== "STAFF") {
      await fetch("/api/auth/signout", { method: "POST" });
      toast.error("此入口仅限员工使用");
      setLoading(false);
      return;
    }

    toast.success("登录成功！");
    router.push("/staff/dashboard");
    router.refresh();
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center bg-green-950 p-3 rounded-2xl">
            <ShieldCheck className="h-8 w-8 text-green-400" />
          </div>
          <h1 className="text-2xl font-bold">万事通</h1>
          <p className="text-sm text-muted-foreground">员工登录</p>
        </div>

        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="staffId">员工 ID</Label>
              <Input
                id="staffId"
                placeholder="请输入员工 ID"
                value={staffId}
                onChange={(e) => setStaffId(e.target.value)}
              />
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
              className="w-full bg-green-700 hover:bg-green-600 text-white"
              onClick={handleLogin}
              disabled={loading}
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              登录
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}