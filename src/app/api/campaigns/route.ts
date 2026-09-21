import { NextResponse } from "next/server";
import { z } from "zod";
import { mutateStore, nid } from "@/lib/db";

export const dynamic = "force-dynamic";

const schema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  goal: z.string().default(""),
  keyword: z.string().min(1),
  wechat: z.string().default(""),
  offer: z.string().min(1),
  cta: z.string().default(""),
});

export async function GET() {
  const store = mutateStore((s) => s);
  return NextResponse.json({ campaigns: store.campaigns });
}

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const campaign = mutateStore((store) => {
    if (store.campaigns.some((c) => c.slug === parsed.data.slug)) return null;
    const item = {
      id: nid("camp"),
      ...parsed.data,
      cta: parsed.data.cta || `评论「${parsed.data.keyword}」领${parsed.data.offer}`,
      createdAt: new Date().toISOString(),
    };
    store.campaigns.unshift(item);
    return item;
  });
  if (!campaign) return NextResponse.json({ error: "短链已被占用" }, { status: 409 });
  return NextResponse.json({ campaign });
}
