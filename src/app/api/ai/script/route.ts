import { NextResponse } from "next/server";
import { z } from "zod";
import { mutateStore } from "@/lib/db";
import { writeScript } from "@/lib/ai/generate";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const parsed = z
    .object({
      brief: z.string().min(2),
      product: z.string().optional().default(""),
      audience: z.string().optional().default(""),
      offer: z.string().optional().default(""),
    })
    .safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const llm = mutateStore((s) => s.settings.llm);
  const draft = await writeScript(llm, parsed.data);
  return NextResponse.json({ draft });
}
