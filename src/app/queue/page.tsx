"use client";

import { useEffect, useState } from "react";
import { formatChina } from "@/lib/scheduler/peak-hours";
import type { CanonicalPost, PostVariant } from "@/lib/types";
import { PlatformName } from "@/components/platform-name";

export default function QueuePage() {
  const [posts, setPosts] = useState<CanonicalPost[]>([]);
  const [variants, setVariants] = useState<PostVariant[]>([]);

  async function reload() {
    const data = await fetch("/api/posts").then((r) => r.json());
    setPosts(data.posts ?? []);
    setVariants(data.variants ?? []);
  }

  useEffect(() => {
    void reload();
  }, []);

  async function publishNow(variantId: string) {
    await fetch("/api/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ variantId }),
    });
    await reload();
  }

  const titleOf = (id: string) => posts.find((p) => p.id === id)?.title ?? "未命名";

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-paper-500">Queue</p>
        <h1 className="mt-1 font-display text-4xl">发布队列</h1>
      </div>
      <div className="card overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-ink-900 text-xs text-paper-500">
            <tr>
              <th className="px-4 py-3">平台</th>
              <th className="px-4 py-3">稿件</th>
              <th className="px-4 py-3">状态</th>
              <th className="px-4 py-3">时间</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-700">
            {variants.map((v) => (
              <tr key={v.id}>
                <td className="px-4 py-3">
                  <PlatformName id={v.platform} />
                </td>
                <td className="max-w-sm truncate px-4 py-3 text-paper-400">{titleOf(v.postId)}</td>
                <td className="px-4 py-3">
                  <span className="chip">{statusLabel(v.status)}</span>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-gold">
                  {v.publishedAt
                    ? formatChina(new Date(v.publishedAt))
                    : v.scheduledAt
                      ? formatChina(new Date(v.scheduledAt))
                      : "—"}
                </td>
                <td className="px-4 py-3 text-right">
                  {v.status !== "published" && (
                    <button className="text-xs text-flame-400" onClick={() => void publishNow(v.id)}>
                      立即发
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!variants.length && <p className="px-4 py-8 text-sm text-paper-500">队列是空的。</p>}
      </div>
    </div>
  );
}

function statusLabel(status: PostVariant["status"]) {
  return {
    draft: "草稿",
    scheduled: "已排期",
    publishing: "发布中",
    published: "已发布",
    failed: "失败",
  }[status];
}
