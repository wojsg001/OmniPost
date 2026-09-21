import { NextResponse } from "next/server";
import { z } from "zod";
import { publishVariant } from "@/lib/scheduler/worker";

const schema = z.object({ variantId: z.string() });

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  await publishVariant(parsed.data.variantId);
  return NextResponse.json({ ok: true });
}
