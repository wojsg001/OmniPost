import { addMinutes, parse, setHours, setMinutes, setSeconds } from "date-fns";
import { fromZonedTime, toZonedTime, formatInTimeZone } from "date-fns-tz";
import type { PeakWindow, PlatformId, SuggestedSlot } from "../types";

export const CHINA_TZ = "Asia/Shanghai";

/** 中国互联网通用刷机高峰（CST） */
export const CHINA_PEAK_WINDOWS: PeakWindow[] = [
  {
    id: "morning",
    label: "早高峰通勤",
    hint: "地铁 / 公众号早报",
    start: "07:30",
    end: "09:00",
    weight: 0.82,
  },
  {
    id: "lunch",
    label: "午间休息",
    hint: "刷微博、小红书种草",
    start: "12:00",
    end: "13:30",
    weight: 0.9,
  },
  {
    id: "afterwork",
    label: "下班黄金档",
    hint: "全平台最高互动",
    start: "18:30",
    end: "20:30",
    weight: 1,
  },
  {
    id: "night",
    label: "晚间刷机",
    hint: "深度阅读与种草决策",
    start: "21:00",
    end: "23:00",
    weight: 0.95,
  },
];

/** 各平台更细的黄金窗口（仍按北京时间，服务中国用户时区） */
export const PLATFORM_PEAK_IDS: Record<PlatformId, string[]> = {
  weibo: ["lunch", "afterwork", "night"],
  wechat_oa: ["morning", "lunch", "night"],
  xiaohongshu: ["lunch", "afterwork", "night"],
  x: ["morning", "lunch", "afterwork"],
  facebook: ["lunch", "afterwork"],
  instagram: ["lunch", "afterwork", "night"],
};

export function nowInChina(date = new Date()) {
  return toZonedTime(date, CHINA_TZ);
}

export function formatChina(date: Date, pattern = "yyyy-MM-dd HH:mm") {
  return formatInTimeZone(date, CHINA_TZ, pattern);
}

function windowOnDay(day: Date, hhmm: string) {
  const parsed = parse(hhmm, "HH:mm", day);
  return setSeconds(setMinutes(setHours(day, parsed.getHours()), parsed.getMinutes()), 0);
}

function windowsFor(platform: PlatformId, enabledPeaks: string[]) {
  const ids = PLATFORM_PEAK_IDS[platform].filter((id) => enabledPeaks.includes(id));
  return CHINA_PEAK_WINDOWS.filter((w) => ids.includes(w.id)).sort(
    (a, b) => b.weight - a.weight,
  );
}

export function nextPeakForPlatform(
  platform: PlatformId,
  options: {
    from?: Date;
    enabledPeaks?: string[];
    avoidExactHour?: boolean;
    offsetMinutes?: number;
  } = {},
): SuggestedSlot {
  const from = options.from ?? new Date();
  const enabled = options.enabledPeaks ?? CHINA_PEAK_WINDOWS.map((w) => w.id);
  const windows = windowsFor(platform, enabled);
  const fallback = CHINA_PEAK_WINDOWS.filter((w) => enabled.includes(w.id));
  const list = windows.length ? windows : fallback;

  const zoned = nowInChina(from);
  for (let dayOffset = 0; dayOffset < 8; dayOffset += 1) {
    const day = new Date(zoned);
    day.setDate(zoned.getDate() + dayOffset);
    const chronological = [...list].sort((a, b) => a.start.localeCompare(b.start));
    for (const window of chronological) {
      let start = windowOnDay(day, window.start);
      if (options.avoidExactHour && start.getMinutes() === 0) {
        start = addMinutes(start, 7);
      }
      if (options.offsetMinutes) {
        start = addMinutes(start, options.offsetMinutes);
      }
      const end = windowOnDay(day, window.end);
      if (dayOffset === 0 && start <= zoned) {
        const soon = addMinutes(zoned, 3);
        if (soon < end) return slot(platform, soon, window);
        continue;
      }
      if (start > zoned || dayOffset > 0) return slot(platform, start, window);
    }
  }

  return slot(platform, addMinutes(from, 60), CHINA_PEAK_WINDOWS[2]);
}

function slot(platform: PlatformId, local: Date, window: PeakWindow): SuggestedSlot {
  const utc = fromZonedTime(local, CHINA_TZ);
  return {
    platform,
    at: utc.toISOString(),
    windowId: window.id,
    windowLabel: window.label,
  };
}

export function suggestSchedule(
  platforms: PlatformId[],
  options: {
    unified?: boolean;
    enabledPeaks?: string[];
    avoidExactHour?: boolean;
    staggerMinutes?: number;
  } = {},
): SuggestedSlot[] {
  if (options.unified) {
    const anchor = nextPeakForPlatform("weibo", options);
    return platforms.map((platform, index) => ({
      ...nextPeakForPlatform(platform, {
        ...options,
        from: new Date(anchor.at),
        offsetMinutes: (options.staggerMinutes ?? 0) * index,
      }),
      at: new Date(
        new Date(anchor.at).getTime() + (options.staggerMinutes ?? 0) * index * 60_000,
      ).toISOString(),
      windowId: anchor.windowId,
      windowLabel: anchor.windowLabel,
      platform,
    }));
  }

  return platforms.map((platform, index) =>
    nextPeakForPlatform(platform, {
      ...options,
      offsetMinutes: (options.staggerMinutes ?? 0) * index,
    }),
  );
}

export function isInPeak(date = new Date(), enabledPeaks?: string[]) {
  const zoned = nowInChina(date);
  const enabled = enabledPeaks ?? CHINA_PEAK_WINDOWS.map((w) => w.id);
  return CHINA_PEAK_WINDOWS.filter((w) => enabled.includes(w.id)).some((window) => {
    const start = windowOnDay(zoned, window.start);
    const end = windowOnDay(zoned, window.end);
    return zoned >= start && zoned <= end;
  });
}

export function currentPeak(date = new Date()) {
  const zoned = nowInChina(date);
  return CHINA_PEAK_WINDOWS.find((window) => {
    const start = windowOnDay(zoned, window.start);
    const end = windowOnDay(zoned, window.end);
    return zoned >= start && zoned <= end;
  });
}
