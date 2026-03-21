import { NextResponse } from "next/server";
import { createStaffAccount, requireAdminUser } from "@/lib/admin";

export async function POST(req: Request) {
  try {
    await requireAdminUser();

    const body = (await req.json()) as {
      name?: string;
      loginId?: string;
      password?: string;
      shopId?: string;
    };

    if (!body.name?.trim() || !body.loginId?.trim() || !body.password || !body.shopId) {
      return NextResponse.json(
        { error: "姓名、员工登录 ID、密码和店铺都是必填项" },
        { status: 400 },
      );
    }

    const result = await createStaffAccount({
      name: body.name,
      loginId: body.loginId,
      password: body.password,
      shopId: body.shopId,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      const messages: Record<string, string> = {
        FORBIDDEN: "无权限",
        INVALID_STAFF_NAME: "员工姓名至少需要 2 个字符",
        INVALID_LOGIN_ID: "员工登录 ID 只能使用 4-32 位字母、数字、下划线或连字符",
        INVALID_PASSWORD: "密码至少需要 6 位",
        SHOP_NOT_FOUND: "店铺不存在",
        LOGIN_ID_EXISTS: "该员工登录 ID 已存在，不能重复创建员工账号",
      };

      const message = messages[error.message];
      if (message) {
        return NextResponse.json(
          { error: message },
          { status: error.message === "FORBIDDEN" ? 403 : 400 },
        );
      }
    }

    console.error("[admin][staff][POST]", error);
    return NextResponse.json(
      { error: "创建员工账号失败，请稍后重试" },
      { status: 500 },
    );
  }
}
