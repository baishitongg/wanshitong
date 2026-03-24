import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getPublicUrl, getSignedUploadUrl } from "@/lib/supabase";

type SessionUser = {
  id?: string;
};

type Body = {
  fileName?: string;
  shopSlug?: string;
};

function normalizeShopSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function POST(req: Request) {
  const session = await auth();
  const user = session?.user as SessionUser | undefined;

  if (!user?.id) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  try {
    const { fileName, shopSlug } = (await req.json()) as Body;

    if (!fileName || typeof fileName !== "string") {
      return NextResponse.json({ error: "缺少文件名称" }, { status: 400 });
    }

    if (!shopSlug || typeof shopSlug !== "string") {
      return NextResponse.json({ error: "缺少店铺标识" }, { status: 400 });
    }

    const normalizedShopSlug = normalizeShopSlug(shopSlug);
    if (!normalizedShopSlug) {
      return NextResponse.json({ error: "店铺标识无效" }, { status: 400 });
    }

    const data = await getSignedUploadUrl(
      fileName,
      `shops/${normalizedShopSlug}/payments/receipts`,
    );

    return NextResponse.json({
      signedUrl: data.signedUrl,
      path: data.path,
      publicUrl: getPublicUrl(data.path),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "生成上传链接失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
