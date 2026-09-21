import { NextResponse } from "next/server";
import { z } from "zod";
import { mutateStore } from "@/lib/db";
import { generateImage } from "@/lib/ai/generate";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const parsed = z.object({ prompt: z.string().min(2) }).safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const llm = mutateStore((s) => s.settings.llm);
  const image = await generateImage(llm, parsed.data.prompt);
  return NextResponse.json({ image });
}
