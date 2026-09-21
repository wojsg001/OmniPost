"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LLM_PROVIDERS } from "@/lib/ai/providers";
import type { LlmProviderId } from "@/lib/types";

interface LlmState {
  provider: LlmProviderId;
  baseUrl: string;
  apiKey: string;
  chatModel: string;
  imageModel: string;
}

export default function StudioPage() {
  const router = useRouter();
  const [llm, setLlm] = useState<LlmState | null>(null);
  const [ready, setReady] = useState(false);
  const [brief, setBrief] = useState("卖给中小商家一套多平台高峰发帖工具，强调少加班、不错过午间和下班档。");
  const [product, setProduct] = useState("OmniPost");
  const [audience, setAudience] = useState("内容运营 / 私域获客团队");
  const [offer, setOffer] = useState("高峰排期清单");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [imagePrompt, setImagePrompt] = useState("");
  const [cover, setCover] = useState("");
  const [usedModel, setUsedModel] = useState("");
  const [busy, setBusy] = useState("");
  const [saved, setSaved] = useState("");

  useEffect(() => {
    void fetch("/api/llm")
      .then((r) => r.json())
      .then((d) => {
        setLlm(d.llm);
        setReady(d.ready);
      });
  }, []);

  async function saveLlm() {
    if (!llm) return;
    setBusy("llm");
    const data = await fetch("/api/llm", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(llm),
    }).then((r) => r.json());
    setLlm(data.llm);
    setReady(data.ready);
    setBusy("");
    setSaved("大模型已绑定");
  }

  async function script() {
    setBusy("script");
    const data = await fetch("/api/ai/script", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ brief, product, audience, offer }),
    }).then((r) => r.json());
    setTitle(data.draft.title);
    setBody(data.draft.body);
    setTags(data.draft.tags);
    setImagePrompt(data.draft.imagePrompt);
    setUsedModel(data.draft.usedModel);
    setBusy("");
  }

  async function image() {
    setBusy("image");
    const data = await fetch("/api/ai/image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: imagePrompt || title || brief }),
    }).then((r) => r.json());
    setCover(data.image.url);
    setUsedModel(data.image.usedModel);
    setBusy("");
  }

  function sendToCompose() {
    sessionStorage.setItem(
      "omnipost-draft",
      JSON.stringify({ title, body, tags, coverImage: cover }),
    );
    router.push("/compose");
  }

  if (!llm) return null;
  const meta = LLM_PROVIDERS.find((p) => p.id === llm.provider);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-paper-500">Studio</p>
        <h1 className="mt-1 font-display text-4xl">绑定大模型，写脚本，生图</h1>
        <p className="mt-2 text-sm text-paper-400">
          支持 OpenAI、DeepSeek、通义、Kimi、智谱、Ollama 和任意兼容接口。没填 Key 时用本地模板写稿、矢量封面，方便 Docker 里先跑通。
        </p>
      </div>

      <section className="card space-y-4 p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl">模型</h2>
          <span className="chip">{ready ? "已绑定" : "未填 Key，走本地模板"}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {LLM_PROVIDERS.map((p) => (
            <button
              key={p.id}
              onClick={() =>
                setLlm({
                  ...llm,
                  provider: p.id,
                  baseUrl: p.baseUrl || llm.baseUrl,
                  chatModel: p.chatModel || llm.chatModel,
                  imageModel: p.imageModel,
                })
              }
              className={`chip ${llm.provider === p.id ? "border-flame-500 text-flame-400" : ""}`}
            >
              {p.name}
            </button>
          ))}
        </div>
        <p className="text-xs text-paper-500">{meta?.hint}</p>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-xs text-paper-500">
            Base URL
            <input
              value={llm.baseUrl}
              onChange={(e) => setLlm({ ...llm, baseUrl: e.target.value })}
              className="mt-1 w-full rounded-xl border border-ink-700 bg-ink-900 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-xs text-paper-500">
            API Key
            <input
              type="password"
              value={llm.apiKey}
              onChange={(e) => setLlm({ ...llm, apiKey: e.target.value })}
              placeholder="sk-..."
              className="mt-1 w-full rounded-xl border border-ink-700 bg-ink-900 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-xs text-paper-500">
            对话模型
            <input
              value={llm.chatModel}
              onChange={(e) => setLlm({ ...llm, chatModel: e.target.value })}
              className="mt-1 w-full rounded-xl border border-ink-700 bg-ink-900 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-xs text-paper-500">
            生图模型
            <input
              value={llm.imageModel}
              onChange={(e) => setLlm({ ...llm, imageModel: e.target.value })}
              placeholder="空则用本地封面"
              className="mt-1 w-full rounded-xl border border-ink-700 bg-ink-900 px-3 py-2 text-sm"
            />
          </label>
        </div>
        <button onClick={() => void saveLlm()} className="rounded-full bg-ink-700 px-4 py-2 text-sm">
          {busy === "llm" ? "保存中…" : "保存绑定"}
        </button>
        {saved && <span className="ml-3 text-sm text-moss">{saved}</span>}
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <div className="card space-y-3 p-5">
          <h2 className="font-display text-2xl">写脚本</h2>
          <textarea
            rows={5}
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            className="w-full rounded-xl border border-ink-700 bg-ink-900 px-3 py-2 text-sm"
          />
          <div className="grid gap-2 md:grid-cols-3">
            <input
              value={product}
              onChange={(e) => setProduct(e.target.value)}
              placeholder="产品"
              className="rounded-xl border border-ink-700 bg-ink-900 px-3 py-2 text-sm"
            />
            <input
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              placeholder="人群"
              className="rounded-xl border border-ink-700 bg-ink-900 px-3 py-2 text-sm"
            />
            <input
              value={offer}
              onChange={(e) => setOffer(e.target.value)}
              placeholder="赠品/钩子"
              className="rounded-xl border border-ink-700 bg-ink-900 px-3 py-2 text-sm"
            />
          </div>
          <button
            disabled={busy === "script"}
            onClick={() => void script()}
            className="rounded-full bg-flame-500 px-4 py-2 text-sm text-white"
          >
            {busy === "script" ? "生成中…" : "生成文稿"}
          </button>
        </div>
        <div className="card space-y-3 p-5">
          <h2 className="font-display text-2xl">生图</h2>
          <textarea
            rows={4}
            value={imagePrompt}
            onChange={(e) => setImagePrompt(e.target.value)}
            placeholder="画面描述，可先写脚本自动带出"
            className="w-full rounded-xl border border-ink-700 bg-ink-900 px-3 py-2 text-sm"
          />
          <button
            disabled={busy === "image"}
            onClick={() => void image()}
            className="rounded-full bg-ink-700 px-4 py-2 text-sm"
          >
            {busy === "image" ? "绘制中…" : "生成封面"}
          </button>
          {cover && <img src={cover} alt="cover" className="mt-2 max-h-56 w-full rounded-xl object-cover" />}
        </div>
      </section>

      {(title || body) && (
        <section className="card space-y-3 p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl">{title}</h2>
            <span className="text-xs text-paper-500">{usedModel}</span>
          </div>
          <pre className="whitespace-pre-wrap font-sans text-sm leading-7 text-paper-100">{body}</pre>
          <p className="text-xs text-gold">{tags.map((t) => `#${t}`).join(" ")}</p>
          <button onClick={sendToCompose} className="rounded-full bg-flame-500 px-4 py-2 text-sm text-white">
            送到写一篇
          </button>
        </section>
      )}
    </div>
  );
}
