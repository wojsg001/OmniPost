"use client";

import { useEffect, useState } from "react";
import type { Campaign, Lead, LeadStatus } from "@/lib/types";

export default function LeadsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [counts, setCounts] = useState({ total: 0, neu: 0, won: 0 });
  const [form, setForm] = useState({
    name: "私域加微信",
    slug: "wechat",
    goal: "评论领资料后加微信",
    keyword: "资料",
    wechat: "omnipost_helper",
    offer: "高峰排期清单",
    cta: "",
  });
  const [message, setMessage] = useState("");

  async function load() {
    const [c, l] = await Promise.all([
      fetch("/api/campaigns").then((r) => r.json()),
      fetch("/api/leads").then((r) => r.json()),
    ]);
    setCampaigns(c.campaigns ?? []);
    setLeads(l.leads ?? []);
    setCounts(l.counts ?? { total: 0, neu: 0, won: 0 });
  }

  useEffect(() => {
    void load();
  }, []);

  async function createCampaign() {
    const res = await fetch("/api/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setMessage(res.ok ? "活动已创建" : data.error || "创建失败");
    await load();
  }

  async function setStatus(id: string, status: LeadStatus) {
    await fetch("/api/leads", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    await load();
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-paper-500">Leads</p>
        <h1 className="mt-1 font-display text-4xl">用内容把人留下来</h1>
        <p className="mt-2 max-w-2xl text-sm text-paper-400">
          给每篇稿挂上获客活动：国内平台走评论关键词 + 微信，海外平台走留资页。线索会进这个箱子。
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ["全部线索", counts.total],
          ["待跟进", counts.neu],
          ["已成交", counts.won],
        ].map(([k, v]) => (
          <div key={k} className="card p-4">
            <p className="text-xs text-paper-500">{k}</p>
            <p className="mt-2 font-display text-3xl">{v}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,.9fr)_minmax(0,1.1fr)]">
        <section className="card space-y-3 p-5">
          <h2 className="font-display text-2xl">新建活动</h2>
          {(
            [
              ["name", "名称"],
              ["slug", "短链 slug"],
              ["keyword", "评论关键词"],
              ["wechat", "微信号"],
              ["offer", "赠品"],
              ["goal", "目标"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="block text-xs text-paper-500">
              {label}
              <input
                value={form[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                className="mt-1 w-full rounded-xl border border-ink-700 bg-ink-900 px-3 py-2 text-sm"
              />
            </label>
          ))}
          <button onClick={() => void createCampaign()} className="rounded-full bg-flame-500 px-4 py-2 text-sm text-white">
            创建
          </button>
          {message && <p className="text-sm text-moss">{message}</p>}
          <div className="space-y-2 pt-2">
            {campaigns.map((c) => (
              <div key={c.id} className="rounded-xl border border-ink-700 p-3 text-sm">
                <div className="flex items-center justify-between">
                  <strong>{c.name}</strong>
                  <a className="text-gold" href={`/go/${c.slug}`} target="_blank" rel="noreferrer">
                    /go/{c.slug}
                  </a>
                </div>
                <p className="mt-1 text-xs text-paper-500">
                  关键词「{c.keyword}」· 微信 {c.wechat} · {c.offer}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="card overflow-hidden p-0">
          <div className="border-b border-ink-700 px-5 py-4">
            <h2 className="font-display text-2xl">线索箱</h2>
          </div>
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-paper-500">
              <tr>
                <th className="px-4 py-3">人</th>
                <th className="px-4 py-3">联系方式</th>
                <th className="px-4 py-3">来源</th>
                <th className="px-4 py-3">状态</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-700">
              {leads.map((lead) => (
                <tr key={lead.id}>
                  <td className="px-4 py-3">{lead.name}</td>
                  <td className="px-4 py-3 text-paper-400">{lead.contact}</td>
                  <td className="px-4 py-3 text-xs">{lead.source}</td>
                  <td className="px-4 py-3">
                    <select
                      value={lead.status}
                      onChange={(e) => void setStatus(lead.id, e.target.value as LeadStatus)}
                      className="rounded-lg border border-ink-700 bg-ink-900 px-2 py-1 text-xs"
                    >
                      <option value="new">待跟进</option>
                      <option value="contacted">已联系</option>
                      <option value="won">成交</option>
                      <option value="lost">流失</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!leads.length && <p className="px-5 py-8 text-sm text-paper-500">还没有线索。打开活动短链试填一单。</p>}
        </section>
      </div>
    </div>
  );
}
