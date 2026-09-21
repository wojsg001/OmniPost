import { NextResponse } from "next/server";
import { z } from "zod";
import { adaptPost } from "@/lib/content/adapt";
import { mutateStore } from "@/lib/db";
import { PLATFORM_IDS } from "@/lib/types";

const schema = z.object({
  title: z.string().default(""),
  body: z.string().default(""),
  tags: z.array(z.string()).default([]),
  coverImage: z.string().default(""),
  originalStatement: z.boolean().default(false),
  campaignId: z.string().nullable().optional(),
  platforms: z.array(z.enum(PLATFORM_IDS)).default([...PLATFORM_IDS]),
});

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;
  const post = {
    id: "preview",
    title: data.title,
    body: data.body,
    tags: data.tags,
    coverImage: data.coverImage,
    originalStatement: data.originalStatement,
    campaignId: data.campaignId ?? null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const campaign = mutateStore((s) => s.campaigns.find((c) => c.id === (data.campaignId || "")) ?? null);
  const variants = Object.fromEntries(data.platforms.map((id) => [id, adaptPost(post, id, campaign)]));
  return NextResponse.json({ variants });
}
