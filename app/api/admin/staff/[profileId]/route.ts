import { NextResponse } from "next/server";
import { requireAdminUser, updateStaffAccount } from "@/lib/admin";

interface Params {
  params: Promise<{ profileId: string }>;
}

export async function PATCH(req: Request, { params }: Params) {
  try {
    await requireAdminUser();

    const { profileId } = await params;
    const body = (await req.json()) as {
      name?: string;
      loginId?: string;
      password?: string;
      shopId?: string;
      isActive?: boolean;
    };

    const result = await updateStaffAccount({
      profileId,
      name: body.name,
      loginId: body.loginId,
      password: body.password || undefined,
      shopId: body.shopId,
      isActive: body.isActive,
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error) {
      const messages: Record<string, string> = {
        FORBIDDEN: "无权限",
        STAFF_NOT_FOUND: "员工账号不存在",
        INVALID_STAFF_NAME: "员工姓名至少需要 2 个字符",
        INVALID_LOGIN_ID: "员工登录 ID 只能使用 4-32 位字母、数字、下划线或连字符",
        INVALID_PASSWORD: "密码至少需要 6 位",
        SHOP_NOT_FOUND: "店铺不存在",
        LOGIN_ID_EXISTS: "该员工登录 ID 已存在",
      };

      const message = messages[error.message];
      if (message) {
        return NextResponse.json(
          { error: message },
          { status: error.message === "FORBIDDEN" ? 403 : 400 },
        );
      }
    }

    console.error("[admin][staff][PATCH]", error);
    return NextResponse.json(
      { error: "更新员工账号失败，请稍后重试" },
      { status: 500 },
    );
  }
}
