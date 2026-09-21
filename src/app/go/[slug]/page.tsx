"use client";

import { useEffect, useState } from "react";
import type { Campaign } from "@/lib/types";

export default function LandingPage({ params }: { params: { slug: string } }) {
  const [campaign, setCampaign] = useState<Campaign | null | undefined>(undefined);
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void fetch("/api/campaigns")
      .then((r) => r.json())
      .then((d) => {
        const found = (d.campaigns as Campaign[]).find((c) => c.slug === params.slug) ?? null;
        setCampaign(found);
      });
  }, [params.slug]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        campaignId: campaign?.id ?? null,
        name,
        contact,
        source: "landing",
        note: `from /go/${params.slug}`,
      }),
    });
    if (!res.ok) {
      setError("提交失败，请换一种联系方式再试");
      return;
    }
    setDone(true);
  }

  if (campaign === undefined) {
    return <p className="pt-24 text-center text-paper-500">加载中…</p>;
  }

  if (!campaign) {
    return (
      <div className="mx-auto max-w-lg pt-24 text-center">
        <h1 className="font-display text-4xl">活动不存在</h1>
        <p className="mt-3 text-paper-400">请检查短链是否正确。</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg">
      <p className="text-xs uppercase tracking-[0.2em] text-paper-500">OmniPost 获客页</p>
      <h1 className="mt-3 font-display text-4xl">{campaign.offer}</h1>
      <p className="mt-3 text-sm leading-7 text-paper-400">{campaign.goal || campaign.cta}</p>
      {campaign.wechat && (
        <p className="mt-3 chip w-fit">加微信 {campaign.wechat}，备注「{campaign.keyword}」</p>
      )}
      {done ? (
        <p className="card mt-8 p-6 text-moss">收到了。我们会用你留下的方式把资料发过来。</p>
      ) : (
        <form onSubmit={(e) => void submit(e)} className="card mt-8 space-y-3 p-6">
          <label className="block text-xs text-paper-500">
            怎么称呼
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-xl border border-ink-700 bg-ink-900 px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-xs text-paper-500">
            微信 / 手机
            <input
              required
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              className="mt-1 w-full rounded-xl border border-ink-700 bg-ink-900 px-3 py-2 text-sm"
            />
          </label>
          {error && <p className="text-xs text-flame-400">{error}</p>}
          <button className="w-full rounded-full bg-flame-500 py-2.5 text-sm text-white">领取 {campaign.offer}</button>
        </form>
      )}
    </div>
  );
}
