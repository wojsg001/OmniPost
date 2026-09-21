import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { mutateStore } from "@/lib/db";
import { currentPeak, formatChina, isInPeak } from "@/lib/scheduler/peak-hours";
import { PLATFORM_ORDER } from "@/lib/platforms/specs";

export async function GET() {
  const store = mutateStore((s) => s);
  const now = new Date();
  const upcoming = store.variants
    .filter((v) => v.status === "scheduled" && v.scheduledAt)
    .sort((a, b) => (a.scheduledAt || "").localeCompare(b.scheduledAt || ""))
    .slice(0, 8);
  const published = store.variants.filter((v) => v.status === "published").length;
  const failed = store.variants.filter((v) => v.status === "failed").length;
  const connected = store.accounts.filter((a) => a.status === "connected").length;
  return NextResponse.json({
    now: formatChina(now),
    inPeak: isInPeak(now, store.settings.enabledPeaks),
    currentPeak: currentPeak(now) ?? null,
    counts: {
      posts: store.posts.length,
      scheduled: store.variants.filter((v) => v.status === "scheduled").length,
      published,
      failed,
      connected,
      platforms: PLATFORM_ORDER.length,
      leads: store.leads.length,
      newLeads: store.leads.filter((l) => l.status === "new").length,
    },
    upcoming,
    recent: store.variants.slice(0, 12),
    settings: store.settings,
  });
}
