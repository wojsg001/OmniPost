"use client";

import { useEffect, useMemo, useState } from "react";
import {
  addDays,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { zhCN } from "date-fns/locale";
import { toZonedTime } from "date-fns-tz";
import { CHINA_TZ, formatChina } from "@/lib/scheduler/peak-hours";
import { PLATFORM_SPECS } from "@/lib/platforms/specs";
import type { PostVariant } from "@/lib/types";
import { PlatformDot } from "@/components/platform-name";

export default function CalendarPage() {
  const [cursor, setCursor] = useState(new Date());
  const [variants, setVariants] = useState<PostVariant[]>([]);

  useEffect(() => {
    void fetch("/api/posts")
      .then((r) => r.json())
      .then((d) => setVariants(d.variants ?? []));
  }, []);

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [cursor]);

  function itemsOn(day: Date) {
    const key = format(day, "yyyy-MM-dd");
    return variants.filter((v) => {
      if (!v.scheduledAt) return false;
      return formatChina(new Date(v.scheduledAt), "yyyy-MM-dd") === key;
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-paper-500">Calendar</p>
          <h1 className="mt-1 font-display text-4xl">{format(cursor, "yyyy年M月", { locale: zhCN })}</h1>
        </div>
        <div className="flex gap-2">
          <button className="chip" onClick={() => setCursor(addDays(cursor, -30))}>
            上月
          </button>
          <button className="chip" onClick={() => setCursor(new Date())}>
            本月
          </button>
          <button className="chip" onClick={() => setCursor(addDays(cursor, 30))}>
            下月
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-2 text-center text-xs text-paper-500">
        {["一", "二", "三", "四", "五", "六", "日"].map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-2">
        {days.map((day) => {
          const items = itemsOn(day);
          const faded = !isSameMonth(day, cursor);
          const today =
            format(toZonedTime(new Date(), CHINA_TZ), "yyyy-MM-dd") === format(day, "yyyy-MM-dd");
          return (
            <div
              key={day.toISOString()}
              className={`card min-h-28 p-2 ${faded ? "opacity-40" : ""} ${today ? "border-flame-500/60" : ""}`}
            >
              <div className="mb-1 text-xs text-paper-500">{format(day, "d")}</div>
              <div className="space-y-1">
                {items.slice(0, 3).map((v) => (
                  <div key={v.id} className="flex items-center gap-1 truncate text-[11px]">
                    <PlatformDot id={v.platform} size={6} />
                    <span>{formatChina(new Date(v.scheduledAt!), "HH:mm")}</span>
                    <span className="truncate text-paper-400">{PLATFORM_SPECS[v.platform].name}</span>
                  </div>
                ))}
                {items.length > 3 && <div className="text-[11px] text-paper-500">+{items.length - 3}</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
