import { NextResponse } from "next/server";
import { z } from "zod";
import { adaptPost } from "@/lib/content/adapt";
import { getAccount, mutateStore, nid } from "@/lib/db";
import { suggestSchedule } from "@/lib/scheduler/peak-hours";
import { publishVariant } from "@/lib/scheduler/worker";
import { PLATFORM_IDS, type PlatformId } from "@/lib/types";

const schema = z.object({
  postId: z.string(),
  platforms: z.array(z.enum(PLATFORM_IDS)).min(1),
  mode: z.enum(["immediate", "next_peak", "custom"]),
  unified: z.boolean().optional().default(false),
  customAt: z.string().optional(),
});

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { postId, platforms, mode, unified, customAt } = parsed.data;
  const storePreview = mutateStore((s) => s);
  const post = storePreview.posts.find((p) => p.id === postId);
  if (!post) return NextResponse.json({ error: "稿件不存在" }, { status: 404 });

  const slots =
    mode === "custom" && customAt
      ? platforms.map((platform) => ({
          platform,
          at: new Date(customAt).toISOString(),
          windowId: "custom",
          windowLabel: "自定义",
        }))
      : suggestSchedule(platforms, {
          unified,
          enabledPeaks: storePreview.settings.enabledPeaks,
          avoidExactHour: storePreview.settings.avoidExactHour,
          staggerMinutes: storePreview.settings.staggerMinutes,
        });

  const variants = mutateStore((store) => {
    const created = platforms.map((platform: PlatformId) => {
      const slot = slots.find((s) => s.platform === platform) ?? slots[0];
      const scheduledAt = mode === "immediate" ? new Date().toISOString() : slot.at;
      const variant = {
        id: nid("var"),
        postId,
        platform,
        accountId: getAccount(store, platform)?.id ?? null,
        content: adaptPost(
          post,
          platform,
          store.campaigns.find((c) => c.id === post.campaignId) ?? null,
        ),
        status: "scheduled" as const,
        scheduledAt,
        publishedAt: null,
        remoteId: null,
        remoteUrl: null,
        error: null,
      };
      store.variants = store.variants.filter(
        (v) => !(v.postId === postId && v.platform === platform && v.status === "draft"),
      );
      store.variants.unshift(variant);
      return variant;
    });
    return created;
  });

  if (mode === "immediate") {
    await Promise.all(variants.map((v) => publishVariant(v.id)));
  }

  return NextResponse.json({ variants, slots });
}
