"use client";

import { useEffect, useMemo, useState } from "react";
import { adaptPost } from "@/lib/content/adapt";
import { PLATFORM_ORDER, PLATFORM_SPECS } from "@/lib/platforms/specs";
import { formatChina, suggestSchedule } from "@/lib/scheduler/peak-hours";
import type { Campaign, PlatformContent, PlatformId, SuggestedSlot } from "@/lib/types";
import { PlatformDot } from "@/components/platform-name";

const SAMPLE = {
  title: "周五晚高峰，一条内容可以发到六个平台",
  body: `很多团队还在每个平台手抄一遍。高峰一过，互动直接腰斩。

微博要短、要钩子、要话题，否则会被折叠。公众号要封面、摘要和原创声明，篇幅给足 300 字以上。小红书要分段、要表情、要标签，看起来才像「笔记」而不是通稿。

海外的 X、Facebook、Instagram 规则完全不同：X 吃加权字数，Facebook 适合把故事讲完整，Instagram 必须配图、标签放文末。但如果你的读者在中国，发帖时间仍然应该对准北京时间的午间、下班档和晚间刷机。

建议把标题写成钩子，把要点拆成短段，封面图提前准备好。同一份母稿先过一遍国内三平台规则，再导出海外版本，比六个后台来回复制更稳。

OmniPost 做的就是这件事：写一次，按平台改写，排进中国互联网高峰。收藏这页，周五晚上直接用。`,
  tags: ["内容运营", "社交媒体", "OmniPost"],
  coverImage: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1200",
  originalStatement: true,
};

export default function ComposePage() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tagInput, setTagInput] = useState("内容运营, 社交媒体");
  const [coverImage, setCoverImage] = useState("");
  const [originalStatement, setOriginalStatement] = useState(true);
  const [selected, setSelected] = useState<PlatformId[]>([...PLATFORM_ORDER]);
  const [unified, setUnified] = useState(false);
  const [mode, setMode] = useState<"immediate" | "next_peak" | "custom">("next_peak");
  const [customAt, setCustomAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [slots, setSlots] = useState<SuggestedSlot[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [campaignId, setCampaignId] = useState<string>("");
  const [brief, setBrief] = useState("");
  const [aiBusy, setAiBusy] = useState("");

  const tags = tagInput
    .split(/[,，#\s]+/)
    .map((t) => t.trim())
    .filter(Boolean);

  const campaign = campaigns.find((c) => c.id === campaignId) ?? null;

  const previews = useMemo(() => {
    const post = {
      id: "preview",
      title,
      body,
      tags,
      coverImage,
      originalStatement,
      campaignId: campaignId || null,
      createdAt: "",
      updatedAt: "",
    };
    return Object.fromEntries(selected.map((id) => [id, adaptPost(post, id, campaign)])) as Record<
      PlatformId,
      PlatformContent
    >;
  }, [title, body, tagInput, coverImage, originalStatement, selected, campaignId, campaigns]);

  useEffect(() => {
    if (!selected.length) return;
    setSlots(suggestSchedule(selected, { unified, avoidExactHour: true, staggerMinutes: 4 }));
  }, [selected, unified]);

  useEffect(() => {
    void fetch("/api/campaigns")
      .then((r) => r.json())
      .then((d) => setCampaigns(d.campaigns ?? []));
    try {
      const raw = sessionStorage.getItem("omnipost-draft");
      if (!raw) return;
      const draft = JSON.parse(raw) as { title?: string; body?: string; tags?: string[]; coverImage?: string };
      if (draft.title) setTitle(draft.title);
      if (draft.body) setBody(draft.body);
      if (draft.tags?.length) setTagInput(draft.tags.join(", "));
      if (draft.coverImage) setCoverImage(draft.coverImage);
      sessionStorage.removeItem("omnipost-draft");
    } catch {
      // ignore
    }
  }, []);

  function toggle(id: PlatformId) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function loadSample() {
    setTitle(SAMPLE.title);
    setBody(SAMPLE.body);
    setTagInput(SAMPLE.tags.join(", "));
    setCoverImage(SAMPLE.coverImage);
    setOriginalStatement(true);
  }

  async function submit() {
    if (!title.trim() || !body.trim() || !selected.length) {
      setMessage("请填写标题、正文，并至少选择一个平台");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const saved = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          body,
          tags,
          coverImage,
          originalStatement,
          campaignId: campaignId || null,
          platforms: selected,
        }),
      }).then((r) => r.json());
      const scheduled = await fetch("/api/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId: saved.post.id,
          platforms: selected,
          mode,
          unified,
          customAt: customAt || undefined,
        }),
      }).then((r) => r.json());
      const when =
        mode === "immediate"
          ? "已立即进入发布队列"
          : `已排入高峰：${(scheduled.slots as SuggestedSlot[])
              .map((s) => `${s.windowLabel} ${formatChina(new Date(s.at), "MM-dd HH:mm")}`)
              .join(" / ")}`;
      setMessage(when);
    } catch {
      setMessage("排期失败，请重试");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-paper-500">Compose</p>
          <h1 className="mt-1 font-display text-4xl">写一次，按平台改写</h1>
        </div>
        <button onClick={loadSample} className="chip hover:border-paper-400">
          载入示例稿
        </button>
      </div>

      <section className="card space-y-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-paper-500">大模型写稿 / 生图 · 获客钩子</p>
          <a href="/studio" className="text-xs text-gold">
            去创作台绑定模型
          </a>
        </div>
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
          <input
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            placeholder="一句话需求，例如：给餐饮老板写周五高峰发帖，送排期清单"
            className="w-full rounded-xl border border-ink-700 bg-ink-900 px-3 py-2 text-sm"
          />
          <div className="flex gap-2">
            <button
              disabled={aiBusy === "script"}
              onClick={async () => {
                setAiBusy("script");
                const data = await fetch("/api/ai/script", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ brief: brief || title || "多平台高峰发帖" }),
                }).then((r) => r.json());
                setTitle(data.draft.title);
                setBody(data.draft.body);
                setTagInput((data.draft.tags || []).join(", "));
                setAiBusy("");
              }}
              className="chip"
            >
              {aiBusy === "script" ? "写稿中…" : "写脚本"}
            </button>
            <button
              disabled={aiBusy === "image"}
              onClick={async () => {
                setAiBusy("image");
                const data = await fetch("/api/ai/image", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ prompt: title || brief || "中国互联网高峰发帖封面" }),
                }).then((r) => r.json());
                setCoverImage(data.image.url);
                setAiBusy("");
              }}
              className="chip"
            >
              {aiBusy === "image" ? "生图中…" : "生封面"}
            </button>
          </div>
        </div>
        <label className="block text-xs text-paper-500">
          挂上获客活动（文案会自动带评论关键词 / 留资链接）
          <select
            value={campaignId}
            onChange={(e) => setCampaignId(e.target.value)}
            className="mt-1 w-full rounded-xl border border-ink-700 bg-ink-900 px-3 py-2 text-sm"
          >
            <option value="">不挂活动</option>
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} · 评「{c.keyword}」
              </option>
            ))}
          </select>
        </label>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
        <section className="card space-y-4 p-5">
          <label className="block text-xs text-paper-500">标题</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="一句话钩子，会进入微博前两行和公众号标题"
            className="w-full rounded-xl border border-ink-700 bg-ink-900 px-3 py-2.5 text-sm"
          />
          <label className="block text-xs text-paper-500">正文（Markdown）</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={14}
            placeholder="同一份母稿。系统会按微博 ≤130 字、公众号 300–2000、小红书分段表情来裁剪。"
            className="w-full resize-y rounded-xl border border-ink-700 bg-ink-900 px-3 py-2.5 text-sm leading-6"
          />
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="block text-xs text-paper-500">标签 / 话题</label>
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                className="mt-1 w-full rounded-xl border border-ink-700 bg-ink-900 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-paper-500">封面图 URL</label>
              <input
                value={coverImage}
                onChange={(e) => setCoverImage(e.target.value)}
                placeholder="公众号 / 小红书 / Instagram 需要"
                className="mt-1 w-full rounded-xl border border-ink-700 bg-ink-900 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-paper-100">
            <input
              type="checkbox"
              checked={originalStatement}
              onChange={(e) => setOriginalStatement(e.target.checked)}
            />
            公众号原创声明
          </label>
        </section>

        <section className="space-y-3">
          <div className="card p-4">
            <p className="mb-3 text-xs text-paper-500">发布到</p>
            <div className="flex flex-wrap gap-2">
              {PLATFORM_ORDER.map((id) => {
                const on = selected.includes(id);
                const spec = PLATFORM_SPECS[id];
                return (
                  <button
                    key={id}
                    onClick={() => toggle(id)}
                    className={`chip ${on ? "border-flame-500/70 bg-flame-500/10" : "opacity-50"}`}
                  >
                    <PlatformDot id={id} />
                    {spec.name}
                    <span className="text-paper-500">{spec.region === "cn" ? "国内" : "海外"}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-3">
            {selected.map((id) => {
              const spec = PLATFORM_SPECS[id];
              const content = previews[id];
              const ratio = Math.min(100, Math.round((content.charCount / spec.preferredChars.max) * 100));
              return (
                <article key={id} className="card p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="flex items-center gap-2 text-sm font-medium">
                      <PlatformDot id={id} />
                      {spec.name}
                      <span className="text-paper-500">{spec.format}</span>
                    </h3>
                    <span className="font-mono text-xs text-gold">
                      {content.charCount}/{spec.preferredChars.max}
                      {spec.preferredChars.min ? ` · 建议 ≥${spec.preferredChars.min}` : ""}
                    </span>
                  </div>
                  <div className="mt-2 h-1 overflow-hidden rounded-full bg-ink-700">
                    <div
                      className={`h-full ${ratio > 100 ? "bg-flame-500" : "bg-moss"}`}
                      style={{ width: `${Math.min(ratio, 100)}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-paper-500">{spec.extras.join(" · ")}</p>
                  <pre className="mt-3 max-h-40 overflow-auto whitespace-pre-wrap font-sans text-sm leading-6 text-paper-100">
                    {content.text || "开始输入后在这里预览改写结果"}
                  </pre>
                  {content.warnings.length > 0 && (
                    <ul className="mt-2 space-y-1 text-xs text-flame-400">
                      {content.warnings.map((w) => (
                        <li key={w}>{w}</li>
                      ))}
                    </ul>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      </div>

      <section className="card sticky bottom-4 z-10 flex flex-col gap-4 p-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <p className="text-xs text-paper-500">排期（北京时间高峰）</p>
          <div className="flex flex-wrap gap-2">
            {[
              ["next_peak", "下一档中国高峰"],
              ["immediate", "立即发布"],
              ["custom", "自定义时间"],
            ].map(([id, label]) => (
              <button
                key={id}
                onClick={() => setMode(id as typeof mode)}
                className={`chip ${mode === id ? "border-flame-500 text-flame-400" : ""}`}
              >
                {label}
              </button>
            ))}
            <button
              onClick={() => setUnified((v) => !v)}
              className={`chip ${unified ? "border-gold text-gold" : ""}`}
            >
              {unified ? "统一高峰" : "按平台各自高峰"}
            </button>
          </div>
          {mode === "custom" && (
            <input
              type="datetime-local"
              value={customAt}
              onChange={(e) => setCustomAt(e.target.value)}
              className="rounded-xl border border-ink-700 bg-ink-900 px-3 py-2 text-sm"
            />
          )}
          {mode === "next_peak" && (
            <p className="text-xs text-paper-400">
              {slots.map((s) => `${PLATFORM_SPECS[s.platform].name} ${formatChina(new Date(s.at), "MM-dd HH:mm")}（${s.windowLabel}）`).join(" · ")}
            </p>
          )}
          {message && <p className="text-sm text-moss">{message}</p>}
        </div>
        <button
          disabled={busy}
          onClick={() => void submit()}
          className="rounded-full bg-flame-500 px-6 py-2.5 text-sm font-medium text-white hover:bg-flame-600 disabled:opacity-50"
        >
          {busy ? "排队中…" : mode === "immediate" ? "立即发布" : "排入高峰"}
        </button>
      </section>
    </div>
  );
}
