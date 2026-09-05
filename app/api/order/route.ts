import { NextResponse } from "next/server";
import { sendOrderToTelegram } from "@/src/lib/telegram";
import type { OrderPayload } from "@/src/types/order";

export async function POST(request: Request) {
  let payload: OrderPayload;

  try {
    payload = (await request.json()) as OrderPayload;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  if (!payload?.name || !payload?.phone || !payload?.email || !payload?.items?.length) {
    return NextResponse.json({ ok: false, error: "missing_fields" }, { status: 400 });
  }

  try {
    const result = await sendOrderToTelegram(payload);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[api/order] Failed to notify Telegram", error);
    return NextResponse.json({ ok: false, error: "telegram_failed" }, { status: 502 });
  }
}
