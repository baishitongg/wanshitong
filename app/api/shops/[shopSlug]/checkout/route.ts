import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "请先完成付款并上传付款凭证后再提交订单" },
    { status: 410 },
  );
}
