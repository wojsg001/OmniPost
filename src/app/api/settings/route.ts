import { NextResponse } from "next/server";
import { z } from "zod";
import { mutateStore } from "@/lib/db";
import { CHINA_PEAK_WINDOWS } from "@/lib/scheduler/peak-hours";
import { maskSecret } from "@/lib/platforms/credentials";

const schema = z.object({
  dryRun: z.boolean().optional(),
  staggerMinutes: z.number().min(0).max(30).optional(),
  avoidExactHour: z.boolean().optional(),
  enabledPeaks: z.array(z.string()).optional(),
});

export async function GET() {
  const store = mutateStore((s) => s);
  return NextResponse.json({
    settings: {
      ...store.settings,
      llm: { ...store.settings.llm, apiKey: store.settings.llm.apiKey ? maskSecret(store.settings.llm.apiKey) : "" },
    },
    windows: CHINA_PEAK_WINDOWS,
  });
}

export async function PATCH(req: Request) {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const settings = mutateStore((store) => {
    store.settings = { ...store.settings, ...parsed.data };
    return store.settings;
  });
  if (typeof parsed.data.dryRun === "boolean") {
    process.env.OMNIPOST_DRY_RUN = parsed.data.dryRun ? "true" : "false";
  }
  return NextResponse.json({ settings });
}
