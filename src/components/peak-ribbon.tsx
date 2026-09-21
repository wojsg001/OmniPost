"use client";

import { CHINA_PEAK_WINDOWS, nowInChina } from "@/lib/scheduler/peak-hours";

function minutes(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export function PeakRibbon({ activeId }: { activeId?: string | null }) {
  const zoned = nowInChina();
  const nowMin = zoned.getHours() * 60 + zoned.getMinutes();
  return (
    <div className="card p-4">
      <div className="mb-3 flex items-end justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-paper-500">中国互联网高峰 · CST</p>
          <h2 className="mt-1 font-display text-2xl text-paper-50">今天 07:30 — 23:00</h2>
        </div>
        <p className="text-xs text-paper-500">
          当前 {String(zoned.getHours()).padStart(2, "0")}:{String(zoned.getMinutes()).padStart(2, "0")}
        </p>
      </div>
      <div className="relative h-14 overflow-hidden rounded-xl bg-ink-900">
        {CHINA_PEAK_WINDOWS.map((w) => {
          const start = minutes(w.start);
          const end = minutes(w.end);
          const left = ((start - 7 * 60) / (16 * 60)) * 100;
          const width = ((end - start) / (16 * 60)) * 100;
          const on = activeId === w.id;
          return (
            <div
              key={w.id}
              className={`absolute top-2 h-10 rounded-lg ${on ? "bg-flame-500/80" : "bg-gold/35"}`}
              style={{ left: `${left}%`, width: `${width}%` }}
              title={`${w.label} ${w.start}-${w.end}`}
            />
          );
        })}
        <div
          className="absolute top-0 h-full w-px bg-paper-50/80"
          style={{ left: `${((nowMin - 7 * 60) / (16 * 60)) * 100}%` }}
        />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {CHINA_PEAK_WINDOWS.map((w) => (
          <span key={w.id} className={`chip ${activeId === w.id ? "border-flame-500 text-flame-400" : ""}`}>
            {w.label} {w.start}-{w.end}
          </span>
        ))}
      </div>
    </div>
  );
}
