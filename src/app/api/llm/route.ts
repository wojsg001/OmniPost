import { NextResponse } from "next/server";
import { z } from "zod";
import { mutateStore } from "@/lib/db";
import { LLM_PROVIDERS } from "@/lib/ai/providers";
import { llmReady } from "@/lib/ai/generate";
import { maskSecret } from "@/lib/platforms/credentials";

export const dynamic = "force-dynamic";

export async function GET() {
  const store = mutateStore((s) => s);
  const llm = store.settings.llm;
  return NextResponse.json({
    providers: LLM_PROVIDERS,
    ready: llmReady(llm),
    llm: { ...llm, apiKey: llm.apiKey ? maskSecret(llm.apiKey) : "" },
  });
}

export async function PATCH(req: Request) {
  const parsed = z
    .object({
      provider: z.enum(["openai", "deepseek", "tongyi", "moonshot", "zhipu", "ollama", "custom"]).optional(),
      baseUrl: z.string().optional(),
      apiKey: z.string().optional(),
      chatModel: z.string().optional(),
      imageModel: z.string().optional(),
    })
    .safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const llm = mutateStore((store) => {
    const next = { ...store.settings.llm };
    if (parsed.data.provider) {
      next.provider = parsed.data.provider;
      const meta = LLM_PROVIDERS.find((p) => p.id === parsed.data.provider);
      if (meta && parsed.data.provider !== "custom") {
        next.baseUrl = parsed.data.baseUrl || meta.baseUrl;
        next.chatModel = parsed.data.chatModel || meta.chatModel;
        next.imageModel = parsed.data.imageModel ?? meta.imageModel;
      }
    }
    if (typeof parsed.data.baseUrl === "string") next.baseUrl = parsed.data.baseUrl;
    if (typeof parsed.data.chatModel === "string") next.chatModel = parsed.data.chatModel;
    if (typeof parsed.data.imageModel === "string") next.imageModel = parsed.data.imageModel;
    if (typeof parsed.data.apiKey === "string" && parsed.data.apiKey && !parsed.data.apiKey.includes("•")) {
      next.apiKey = parsed.data.apiKey.trim();
    }
    store.settings.llm = next;
    return next;
  });
  return NextResponse.json({
    ready: llmReady(llm),
    llm: { ...llm, apiKey: llm.apiKey ? maskSecret(llm.apiKey) : "" },
  });
}
