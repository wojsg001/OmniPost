import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { z } from "zod";
import { adaptPost } from "@/lib/content/adapt";
import { getAccount, mutateStore, nid, upsertPost } from "@/lib/db";
import { PLATFORM_IDS, type PlatformId } from "@/lib/types";

const schema = z.object({
  id: z.string().optional(),
  title: z.string().min(1),
  body: z.string().min(1),
  tags: z.array(z.string()).default([]),
  coverImage: z.string().optional().default(""),
  originalStatement: z.boolean().optional().default(false),
  campaignId: z.string().nullable().optional().default(null),
  platforms: z.array(z.enum(PLATFORM_IDS)).min(1),
});

export async function GET() {
  const store = mutateStore((s) => s);
  return NextResponse.json({
    posts: store.posts,
    variants: store.variants,
  });
}

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;
  const post = upsertPost(data);
  const variants = mutateStore((store) => {
    store.variants = store.variants.filter((v) => v.postId !== post.id);
    const created = data.platforms.map((platform: PlatformId) => ({
      id: nid("var"),
      postId: post.id,
      platform,
      accountId: getAccount(store, platform)?.id ?? null,
      content: adaptPost(
        post,
        platform,
        store.campaigns.find((c) => c.id === post.campaignId) ?? null,
      ),
      status: "draft" as const,
      scheduledAt: null,
      publishedAt: null,
      remoteId: null,
      remoteUrl: null,
      error: null,
    }));
    store.variants.unshift(...created);
    return created;
  });
  return NextResponse.json({ post, variants });
}
