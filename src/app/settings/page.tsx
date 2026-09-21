"use client";

import { useEffect, useState } from "react";
import { CHINA_PEAK_WINDOWS } from "@/lib/scheduler/peak-hours";
import type { AppSettings } from "@/lib/types";

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [saved, setSaved] = useState("");

  useEffect(() => {
    void fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => setSettings(d.settings));
  }, []);

  async function save(next: AppSettings) {
    setSettings(next);
    await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    });
    setSaved("已保存");
  }

  if (!settings) return null;

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-paper-500">Settings</p>
        <h1 className="mt-1 font-display text-4xl">高峰与发布策略</h1>
      </div>
      <section className="card space-y-4 p-5">
        <label className="flex items-center justify-between gap-4 text-sm">
          模拟发布（不调用真实 API）
          <input
            type="checkbox"
            checked={settings.dryRun}
            onChange={(e) => void save({ ...settings, dryRun: e.target.checked })}
          />
        </label>
        <label className="flex items-center justify-between gap-4 text-sm">
          避开整点（减少 18:00 扎堆）
          <input
            type="checkbox"
            checked={settings.avoidExactHour}
            onChange={(e) => void save({ ...settings, avoidExactHour: e.target.checked })}
          />
        </label>
        <label className="block text-sm">
          多平台错开分钟数
          <input
            type="number"
            min={0}
            max={30}
            value={settings.staggerMinutes}
            onChange={(e) => void save({ ...settings, staggerMinutes: Number(e.target.value) })}
            className="mt-2 w-32 rounded-xl border border-ink-700 bg-ink-900 px-3 py-2"
          />
        </label>
      </section>
      <section className="card p-5">
        <h2 className="mb-3 font-display text-2xl">启用的中国高峰窗口</h2>
        <div className="grid gap-2">
          {CHINA_PEAK_WINDOWS.map((w) => {
            const on = settings.enabledPeaks.includes(w.id);
            return (
              <button
                key={w.id}
                onClick={() => {
                  const enabledPeaks = on
                    ? settings.enabledPeaks.filter((id) => id !== w.id)
                    : [...settings.enabledPeaks, w.id];
                  void save({ ...settings, enabledPeaks });
                }}
                className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left ${
                  on ? "border-flame-500/50 bg-flame-500/10" : "border-ink-700"
                }`}
              >
                <span>
                  {w.label}
                  <span className="ml-2 text-xs text-paper-500">{w.hint}</span>
                </span>
                <span className="font-mono text-xs text-gold">
                  {w.start}–{w.end}
                </span>
              </button>
            );
          })}
        </div>
        {saved && <p className="mt-3 text-sm text-moss">{saved}</p>}
      </section>
    </div>
  );
}
