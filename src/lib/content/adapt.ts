import type { Campaign, CanonicalPost, PlatformContent, PlatformId } from "../types";
import { PLATFORM_SPECS } from "../platforms/specs";
import { ctaFor } from "../leads/cta";

const EMOJI_CYCLE = ["✨", "📌", "💡", "🔥", "🫶", "🌟", "📝", "🎯"];

export function countChars(text: string) {
  return [...text.replace(/\s+/g, " ").trim()].length;
}

/** X 加权字数：CJK、Emoji 计 2 */
export function countXWeighted(text: string) {
  let n = 0;
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 0;
    if (code > 0x7f) n += 2;
    else n += 1;
  }
  return n;
}

function clipChars(text: string, max: number) {
  const chars = [...text];
  if (chars.length <= max) return text;
  return `${chars.slice(0, Math.max(1, max - 1)).join("")}…`;
}

function clipWeighted(text: string, max: number) {
  let out = "";
  for (const ch of text) {
    const next = out + ch;
    if (countXWeighted(next) > max) break;
    out = next;
  }
  return out.trim();
}

function firstSentences(text: string, max: number) {
  const clean = text.replace(/\s+/g, " ").trim();
  if ([...clean].length <= max) return clean;
  const cut = [...clean].slice(0, max).join("");
  const mark = Math.max(cut.lastIndexOf("。"), cut.lastIndexOf("！"), cut.lastIndexOf("？"), cut.lastIndexOf("."));
  return (mark > 24 ? cut.slice(0, mark + 1) : cut).trim();
}

function topicsFrom(tags: string[], body: string) {
  const fromTags = tags.map((t) => t.replace(/^#/, "").trim()).filter(Boolean);
  const fromBody = [...body.matchAll(/#([^\s#]{1,20})#/g)].map((m) => m[1]);
  return [...new Set([...fromTags, ...fromBody])].slice(0, 8);
}

function paragraphs(body: string) {
  return body
    .split(/\n{2,}|\n/)
    .map((p) => p.replace(/^#+\s*/, "").replace(/\*\*/g, "").trim())
    .filter(Boolean);
}

function toHtml(title: string, body: string, original: boolean) {
  const blocks = body.split(/\n{2,}/).map((block) => {
    const line = block.trim();
    if (!line) return "";
    if (line.startsWith("### ")) return `<h3>${esc(line.slice(4))}</h3>`;
    if (line.startsWith("## ")) return `<h2>${esc(line.slice(3))}</h2>`;
    if (line.startsWith("# ")) return `<h2>${esc(line.slice(2))}</h2>`;
    if (line.startsWith("- ")) {
      const items = line.split("\n").map((l) => `<li>${esc(l.replace(/^- /, ""))}</li>`);
      return `<ul>${items.join("")}</ul>`;
    }
    const withBold = esc(line).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    return `<p>${withBold.replaceAll("\n", "<br/>")}</p>`;
  });
  const origin = original
    ? `<p style="color:#888;font-size:12px;">声明：本文为原创内容，未经授权不得转载。</p>`
    : "";
  return `<article><h1>${esc(title)}</h1>${blocks.join("")}${origin}</article>`;
}

function esc(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function warnLength(count: number, min: number, max: number, hard: number) {
  const warnings: string[] = [];
  if (min > 0 && count < min) warnings.push(`偏短，建议至少 ${min} 字`);
  if (count > max && count <= hard) warnings.push(`超过推荐 ${max} 字，可能被折叠或完读下降`);
  if (count > hard) warnings.push(`超过硬限制 ${hard}，发布前会截断`);
  return warnings;
}

function adaptWeibo(post: CanonicalPost): PlatformContent {
  const spec = PLATFORM_SPECS.weibo;
  const topics = topicsFrom(post.tags, post.body);
  const hook = firstSentences(post.title || post.body, 28);
  const rest = paragraphs(post.body).join(" ").replace(post.title, "").trim();
  const topicStr = topics.map((t) => `#${t}#`).join(" ");
  const topicCount = countChars(topicStr);
  const budget = Math.max(24, spec.preferredChars.max - topicCount - (topicStr ? 1 : 0));
  const core = clipChars(`${hook} ${rest}`.replace(/\s+/g, " ").trim(), budget);
  const text = `${core}${topicStr ? ` ${topicStr}` : ""}`.trim();
  const warnings = warnLength(countChars(text), spec.preferredChars.min, spec.preferredChars.max, spec.preferredChars.hard);
  if (!hook) warnings.push("缺少前两行钩子，容易被折叠");
  return {
    text,
    tags: topics,
    topics,
    coverImage: post.coverImage || undefined,
    warnings,
    charCount: countChars(text),
  };
}

function adaptWechat(post: CanonicalPost): PlatformContent {
  const spec = PLATFORM_SPECS.wechat_oa;
  const title = post.title || firstSentences(post.body, 24);
  const body = post.body.trim();
  const digest = firstSentences(body.replace(/[#*]/g, ""), 54);
  const html = toHtml(title, body, post.originalStatement);
  const warnings = warnLength(countChars(body), spec.preferredChars.min, spec.preferredChars.max, spec.preferredChars.hard);
  if (!post.coverImage) warnings.push("公众号需要封面图");
  if (!post.originalStatement) warnings.push("未勾选原创声明");
  if (!digest) warnings.push("缺少摘要");
  return {
    title,
    text: body,
    html,
    digest,
    tags: post.tags,
    coverImage: post.coverImage || undefined,
    warnings,
    charCount: countChars(body),
  };
}

function adaptXhs(post: CanonicalPost): PlatformContent {
  const spec = PLATFORM_SPECS.xiaohongshu;
  const paras = paragraphs(post.body);
  const expanded = (paras.length ? paras : [post.body]).flatMap((p, i) => {
    const emoji = EMOJI_CYCLE[i % EMOJI_CYCLE.length];
    return [`${emoji} ${p}`, ""];
  });
  const titleLine = post.title ? `【${post.title}】\n` : "";
  const tags = topicsFrom(post.tags, post.body).slice(0, 10);
  const tagLine = tags.map((t) => `#${t}`).join(" ");
  let text = `${titleLine}${expanded.join("\n")}`.trim();
  if (countChars(text) < spec.preferredChars.min) {
    text += `\n\n✨ 先收藏，回头慢慢看。\n💡 有用的话评论区聊聊你的做法。`;
  }
  if (tagLine) text += `\n\n${tagLine}`;
  const warnings = warnLength(countChars(text), spec.preferredChars.min, spec.preferredChars.max, spec.preferredChars.hard);
  if (!post.coverImage) warnings.push("小红书需要封面图");
  if (tags.length < 3) warnings.push("标签偏少，建议 5 个左右");
  return {
    title: post.title,
    text,
    tags,
    coverImage: post.coverImage || undefined,
    warnings,
    charCount: countChars(text),
  };
}

function adaptX(post: CanonicalPost): PlatformContent {
  const spec = PLATFORM_SPECS.x;
  const tags = topicsFrom(post.tags, post.body).slice(0, 3);
  const tagStr = tags.map((t) => `#${t.replace(/\s/g, "")}`).join(" ");
  const tagWeight = countXWeighted(tagStr) + (tagStr ? 2 : 0);
  const core = clipWeighted(
    firstSentences(`${post.title}。${paragraphs(post.body).join(" ")}`, 400),
    Math.max(20, spec.preferredChars.max - tagWeight),
  );
  const text = `${core}${tagStr ? `\n\n${tagStr}` : ""}`.trim();
  return {
    text,
    tags,
    coverImage: post.coverImage || undefined,
    warnings: warnLength(countXWeighted(text), 0, spec.preferredChars.max, spec.preferredChars.hard),
    charCount: countXWeighted(text),
  };
}

function adaptFacebook(post: CanonicalPost): PlatformContent {
  const spec = PLATFORM_SPECS.facebook;
  const text = [post.title, "", paragraphs(post.body).join("\n\n"), "", post.tags.map((t) => `#${t}`).join(" ")]
    .join("\n")
    .trim();
  const warnings = warnLength(countChars(text), spec.preferredChars.min, spec.preferredChars.max, spec.preferredChars.hard);
  return {
    title: post.title,
    text,
    tags: post.tags,
    coverImage: post.coverImage || undefined,
    warnings,
    charCount: countChars(text),
  };
}

function adaptInstagram(post: CanonicalPost): PlatformContent {
  const spec = PLATFORM_SPECS.instagram;
  const paras = paragraphs(post.body).slice(0, 6);
  const text = [`${post.title}`, "", paras.join("\n\n"), "", post.tags.map((t) => `#${t.replace(/\s/g, "")}`).join(" ")]
    .join("\n")
    .trim();
  const warnings = warnLength(countChars(text), spec.preferredChars.min, spec.preferredChars.max, spec.preferredChars.hard);
  if (!post.coverImage) warnings.push("Instagram 发帖必须有图");
  return {
    title: post.title,
    text,
    tags: post.tags,
    coverImage: post.coverImage || undefined,
    warnings,
    charCount: countChars(text),
  };
}

const ADAPTERS: Record<PlatformId, (post: CanonicalPost) => PlatformContent> = {
  weibo: adaptWeibo,
  wechat_oa: adaptWechat,
  xiaohongshu: adaptXhs,
  x: adaptX,
  facebook: adaptFacebook,
  instagram: adaptInstagram,
};

export function adaptPost(
  post: CanonicalPost,
  platform: PlatformId,
  campaign?: Campaign | null,
): PlatformContent {
  const content = ADAPTERS[platform](post);
  if (!campaign) return content;
  const cta = ctaFor(platform, campaign);
  if (platform === "weibo") {
    content.text = clipChars(`${content.text} ${cta}`, PLATFORM_SPECS.weibo.preferredChars.max);
    content.charCount = countChars(content.text);
  } else if (platform === "x") {
    content.text = clipWeighted(`${content.text}\n\n${cta}`, PLATFORM_SPECS.x.preferredChars.max);
    content.charCount = countXWeighted(content.text);
  } else {
    content.text = `${content.text}\n\n${cta}`.trim();
    content.charCount = countChars(content.text);
  }
  return content;
}

export function adaptMany(post: CanonicalPost, platforms: PlatformId[], campaign?: Campaign | null) {
  return Object.fromEntries(platforms.map((id) => [id, adaptPost(post, id, campaign)])) as Record<
    PlatformId,
    PlatformContent
  >;
}
