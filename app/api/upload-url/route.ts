import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getPublicUrl, getSignedUploadUrl } from "@/lib/supabase";

type SessionUser = {
  role?: string;
};

export async function POST(req: Request) {
  const session = await auth();
  const role = (session?.user as SessionUser | undefined)?.role;

  if (role !== "STAFF" && role !== "ADMIN") {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }

  try {
    const { fileName, folder } = (await req.json()) as {
      fileName?: string;
      folder?: string;
    };

    if (!fileName || typeof fileName !== "string") {
      return NextResponse.json({ error: "缺少文件名称" }, { status: 400 });
    }

    const data = await getSignedUploadUrl(
      fileName,
      typeof folder === "string" ? folder : undefined,
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
