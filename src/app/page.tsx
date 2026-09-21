"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PeakRibbon } from "@/components/peak-ribbon";
import { PlatformName } from "@/components/platform-name";
import { formatChina } from "@/lib/scheduler/peak-hours";
import type { PeakWindow, PostVariant } from "@/lib/types";

interface Stats {
  now: string;
  inPeak: boolean;
  currentPeak: PeakWindow | null;
  counts: {
    posts: number;
    scheduled: number;
    published: number;
    failed: number;
    connected: number;
    platforms: number;
    leads: number;
    newLeads: number;
  };
  upcoming: PostVariant[];
}

export default function HomePage() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    void fetch("/api/stats")
      .then((r) => r.json())
      .then(setStats);
  }, []);

  const counts = stats?.counts;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-paper-500">Dashboard</p>
          <h1 className="mt-1 font-display text-4xl md:text-5xl">把同一篇稿，发到中外六个平台</h1>
          <p className="mt-2 max-w-2xl text-sm text-paper-400">
            绑定微博、公众号、小红书和 X / Facebook / Instagram，高峰发帖，挂上获客钩子。创作台可接大模型写脚本、生封面。
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/studio" className="rounded-full border border-ink-700 px-5 py-2.5 text-sm">
            创作台
          </Link>
          <Link
            href="/compose"
            className="rounded-full bg-flame-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-flame-600"
          >
            写一篇
          </Link>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["今日待发", counts?.scheduled ?? 0],
          ["已发布", counts?.published ?? 0],
          ["已绑定账号", `${counts?.connected ?? 0}/${counts?.platforms ?? 6}`],
          ["待跟进线索", counts?.newLeads ?? 0],
        ].map(([k, v]) => (
          <div key={k} className="card p-4">
            <p className="text-xs text-paper-500">{k}</p>
            <p className="mt-2 font-display text-3xl">{v}</p>
          </div>
        ))}
      </div>

      <PeakRibbon activeId={stats?.currentPeak?.id} />

      <section className="card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-2xl">即将发出</h2>
          <span className="text-xs text-paper-500">{stats?.inPeak ? "正处于高峰窗口" : "等待下一档高峰"}</span>
        </div>
        {stats?.upcoming.length ? (
          <ul className="divide-y divide-ink-700">
            {stats.upcoming.map((v) => (
              <li key={v.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                <PlatformName id={v.platform} />
                <p className="max-w-xl flex-1 text-paper-400">{v.content.text.slice(0, 80)}</p>
                <span className="font-mono text-xs text-gold">
                  {v.scheduledAt ? formatChina(new Date(v.scheduledAt)) : "—"}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-paper-500">还没有排期。去写一篇，选「下一档中国高峰」。</p>
        )}
      </section>
    </div>
  );
}
