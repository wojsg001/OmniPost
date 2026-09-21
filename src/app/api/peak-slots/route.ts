import { NextResponse } from "next/server";
import { mutateStore } from "@/lib/db";
import { CHINA_PEAK_WINDOWS, suggestSchedule } from "@/lib/scheduler/peak-hours";
import { PLATFORM_IDS } from "@/lib/types";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const unified = searchParams.get("unified") === "1";
  const platforms = (searchParams.get("platforms")?.split(",") || PLATFORM_IDS).filter((p) =>
    PLATFORM_IDS.includes(p as (typeof PLATFORM_IDS)[number]),
  ) as typeof PLATFORM_IDS[number][];
  const store = mutateStore((s) => s);
  const slots = suggestSchedule(platforms, {
    unified,
    enabledPeaks: store.settings.enabledPeaks,
    avoidExactHour: store.settings.avoidExactHour,
    staggerMinutes: store.settings.staggerMinutes,
  });
  return NextResponse.json({ windows: CHINA_PEAK_WINDOWS, slots, timezone: store.settings.timezone });
}
