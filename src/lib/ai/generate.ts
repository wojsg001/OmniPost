import { mkdirSync, writeFileSync } from "fs";
import path from "path";
import type { LlmConfig } from "../types";
import { LLM_PROVIDERS } from "./providers";
import { nid } from "../db";

export interface ScriptDraft {
  title: string;
  body: string;
  tags: string[];
  imagePrompt: string;
  cta: string;
  usedModel: string;
}

function providerOf(llm: LlmConfig) {
  return LLM_PROVIDERS.find((p) => p.id === llm.provider);
}

export function llmReady(llm: LlmConfig) {
  return Boolean(llm.apiKey || llm.provider === "ollama");
}

function localScript(brief: string, product: string, audience: string, offer: string): ScriptDraft {
  const who = audience || "在中国互联网做内容的团队";
  const what = product || "同一套内容多平台分发";
  const gift = offer || "高峰排期清单";
  const hook = brief.trim().split(/\n/)[0]?.slice(0, 28) || `别再每个平台手抄一遍`;
  const title = `${hook}：把${what}做成可复制的动作`;
  const body = `${brief.trim() || `${who}最常见的损耗，不是不会写，而是写完以后还要改六遍、错过高峰。`}

${what}真正难的是两件事：平台规则不同，以及中国用户只在固定窗口刷手机。

微博要短、要钩子、要话题。公众号要封面、摘要、原创声明。小红书要分段和表情。海外的 X、Facebook、Instagram 规则完全不同，但读者如果在中国，发帖时间仍应对准北京时间的午间、下班档和晚间。

把同一份母稿先写清楚，再按平台裁剪，比六个后台来回粘贴更稳。封面图提前准备，获客钩子（评论关键词 / 微信 / 留资页）写进文末，高峰时段再发出去。

领取 ${gift}，按明天的窗口排一次就知道差别。`;
  return {
    title,
    body,
    tags: ["内容运营", "获客", what.replace(/\s/g, "").slice(0, 8) || "社媒"].filter(Boolean),
    imagePrompt: `Editorial dark poster, Chinese social media control room at dusk, neon subway lights, title “${title.slice(0, 18)}”, no watermark, 16:9`,
    cta: `评论「资料」领取 ${gift}`,
    usedModel: "local-template",
  };
}

function parseJson(text: string) {
  const fenced = text.match(/\{[\s\S]*\}/);
  if (!fenced) return null;
  try {
    return JSON.parse(fenced[0]) as Partial<ScriptDraft>;
  } catch {
    return null;
  }
}

export async function writeScript(
  llm: LlmConfig,
  input: { brief: string; product?: string; audience?: string; offer?: string },
): Promise<ScriptDraft> {
  const fallback = localScript(input.brief, input.product || "", input.audience || "", input.offer || "");
  if (!llmReady(llm) || !llm.baseUrl) return fallback;

  const prompt = `你是中国互联网内容主编。根据需求写一篇可拆到微博/公众号/小红书/X/Facebook/Instagram 的母稿。
用中文。只输出 JSON：{"title":"","body":"","tags":[],"imagePrompt":"","cta":""}
body 用空行分段，400-800 字。imagePrompt 用英文画面描述。
需求：${input.brief}
产品：${input.product || "未指定"}
人群：${input.audience || "未指定"}
赠品/钩子：${input.offer || "未指定"}`;

  try {
    const res = await fetch(`${llm.baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(llm.apiKey ? { Authorization: `Bearer ${llm.apiKey}` } : {}),
      },
      body: JSON.stringify({
        model: llm.chatModel || providerOf(llm)?.chatModel || "gpt-4o-mini",
        temperature: 0.7,
        messages: [
          { role: "system", content: "只输出合法 JSON，不要 markdown。" },
          { role: "user", content: prompt },
        ],
      }),
    });
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[]; error?: { message?: string } };
    if (!res.ok) throw new Error(data.error?.message || `模型错误 ${res.status}`);
    const parsed = parseJson(data.choices?.[0]?.message?.content || "");
    if (!parsed?.title || !parsed.body) throw new Error("模型没有返回完整文稿");
    return {
      title: parsed.title,
      body: parsed.body,
      tags: parsed.tags?.length ? parsed.tags : fallback.tags,
      imagePrompt: parsed.imagePrompt || fallback.imagePrompt,
      cta: parsed.cta || fallback.cta,
      usedModel: llm.chatModel,
    };
  } catch {
    return fallback;
  }
}

function svgCover(title: string) {
  const safe = title
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .slice(0, 32);
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#2a1812"/>
      <stop offset="1" stop-color="#0c0b0a"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#g)"/>
  <text x="72" y="120" fill="#e85d3a" font-size="22" font-family="sans-serif">OMNIPOST</text>
  <text x="72" y="280" fill="#f7f1e8" font-size="48" font-family="serif">${safe}</text>
  <text x="72" y="540" fill="#9a8d7c" font-size="20" font-family="sans-serif">中国互联网高峰 · 一次写稿六平台</text>
</svg>`;
}

export async function generateImage(llm: LlmConfig, prompt: string): Promise<{ url: string; usedModel: string }> {
  mkdirSync(path.join(process.cwd(), "data", "uploads"), { recursive: true });
  const name = `${nid("img")}.svg`;
  const file = path.join(process.cwd(), "data", "uploads", name);
  const url = `/api/media/${name}`;

  if (llm.apiKey && llm.imageModel && llm.baseUrl) {
    try {
      const res = await fetch(`${llm.baseUrl.replace(/\/$/, "")}/images/generations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${llm.apiKey}`,
        },
        body: JSON.stringify({
          model: llm.imageModel,
          prompt,
          size: "1200x630",
          n: 1,
        }),
      });
      const data = (await res.json()) as {
        data?: { url?: string; b64_json?: string }[];
        error?: { message?: string };
      };
      if (data.data?.[0]?.url) {
        return { url: data.data[0].url, usedModel: llm.imageModel };
      }
      if (data.data?.[0]?.b64_json) {
        const png = `${nid("img")}.png`;
        writeFileSync(path.join(process.cwd(), "data", "uploads", png), Buffer.from(data.data[0].b64_json, "base64"));
        return { url: `/api/media/${png}`, usedModel: llm.imageModel };
      }
    } catch {
      // fall through to local cover
    }
  }

  writeFileSync(file, svgCover(prompt.slice(0, 24)));
  return { url, usedModel: "local-cover" };
}
