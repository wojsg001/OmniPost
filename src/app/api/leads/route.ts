import { NextResponse } from "next/server";
import { z } from "zod";
import { mutateStore, nid } from "@/lib/db";
import { PLATFORM_IDS } from "@/lib/types";

export const dynamic = "force-dynamic";

const schema = z.object({
  campaignId: z.string().nullable().optional(),
  name: z.string().min(1),
  contact: z.string().min(2),
  source: z.enum([...PLATFORM_IDS, "landing", "manual"] as [string, ...string[]]).default("landing"),
  note: z.string().optional().default(""),
});

export async function GET() {
  const store = mutateStore((s) => s);
  return NextResponse.json({
    leads: store.leads,
    campaigns: store.campaigns,
    counts: {
      total: store.leads.length,
      neu: store.leads.filter((l) => l.status === "new").length,
      won: store.leads.filter((l) => l.status === "won").length,
    },
  });
}

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const lead = mutateStore((store) => {
    const item = {
      id: nid("lead"),
      campaignId: parsed.data.campaignId ?? null,
      name: parsed.data.name,
      contact: parsed.data.contact,
      source: parsed.data.source as typeof store.leads[number]["source"],
      note: parsed.data.note || "",
      status: "new" as const,
      createdAt: new Date().toISOString(),
    };
    store.leads.unshift(item);
    return item;
  });
  return NextResponse.json({ lead });
}

export async function PATCH(req: Request) {
  const parsed = z
    .object({ id: z.string(), status: z.enum(["new", "contacted", "won", "lost"]) })
    .safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const lead = mutateStore((store) => {
    const item = store.leads.find((l) => l.id === parsed.data.id);
    if (item) item.status = parsed.data.status;
    return item ?? null;
  });
  if (!lead) return NextResponse.json({ error: "线索不存在" }, { status: 404 });
  return NextResponse.json({ lead });
}
