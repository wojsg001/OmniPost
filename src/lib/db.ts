import { randomUUID } from "crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import type { Account, AppSettings, Campaign, CanonicalPost, PlatformId, Store } from "./types";
import { PLATFORM_ORDER } from "./platforms/specs";
import { CHINA_PEAK_WINDOWS } from "./scheduler/peak-hours";
import { DEFAULT_LLM } from "./ai/providers";

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "omnipost.json");

export const defaultSettings: AppSettings = {
  timezone: "Asia/Shanghai",
  dryRun: true,
  staggerMinutes: 4,
  avoidExactHour: true,
  enabledPeaks: CHINA_PEAK_WINDOWS.map((w) => w.id),
  llm: { ...DEFAULT_LLM },
};

function defaultAccounts(): Account[] {
  const now = new Date().toISOString();
  const names: Record<PlatformId, string> = {
    weibo: "未连接微博",
    wechat_oa: "未连接公众号",
    xiaohongshu: "未连接小红书",
    x: "未连接 X",
    facebook: "未连接 Facebook",
    instagram: "未连接 Instagram",
  };
  return PLATFORM_ORDER.map((platform) => ({
    id: `acc_${platform}`,
    platform,
    displayName: names[platform],
    status: "disconnected" as const,
    hint: "授权登录或手动粘贴凭证",
    updatedAt: now,
    credentials: {},
    bindMethod: null,
    boundAt: null,
    profileUrl: null,
  }));
}

export function seedCampaign(): Campaign {
  return {
    id: "camp_pack",
    name: "资料包获客",
    slug: "pack",
    goal: "评论关键词领资料，沉淀微信",
    keyword: "资料",
    wechat: "omnipost_helper",
    offer: "《中国互联网高峰排期清单》",
    cta: "评论「资料」，我把清单发你",
    createdAt: new Date().toISOString(),
  };
}

function emptyStore(): Store {
  return {
    settings: defaultSettings,
    accounts: defaultAccounts(),
    posts: [],
    variants: [],
    oauthPending: null,
    campaigns: [seedCampaign()],
    leads: [],
  };
}

function ensure() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  if (!existsSync(path.join(DATA_DIR, "uploads"))) mkdirSync(path.join(DATA_DIR, "uploads"), { recursive: true });
  if (!existsSync(DATA_FILE)) {
    writeFileSync(DATA_FILE, JSON.stringify(emptyStore(), null, 2));
  }
}

function normalizeAccount(raw: Partial<Account>, fallback: Account): Account {
  return {
    ...fallback,
    ...raw,
    credentials: raw.credentials ?? {},
    bindMethod: raw.bindMethod ?? null,
    boundAt: raw.boundAt ?? null,
    profileUrl: raw.profileUrl ?? null,
    hint: raw.hint || fallback.hint,
  };
}

export function readStore(): Store {
  ensure();
  const raw = JSON.parse(readFileSync(DATA_FILE, "utf8")) as Partial<Store>;
  const defaults = defaultAccounts();
  const accounts = (raw.accounts?.length ? raw.accounts : defaults).map((account) => {
    const fallback = defaults.find((d) => d.platform === account.platform) ?? defaults[0];
    return normalizeAccount(account, fallback);
  });
  for (const fallback of defaults) {
    if (!accounts.some((a) => a.platform === fallback.platform)) accounts.push(fallback);
  }
  return {
    settings: {
      ...defaultSettings,
      ...(raw.settings || {}),
      llm: {
        ...DEFAULT_LLM,
        ...(raw.settings?.llm || {}),
        apiKey: raw.settings?.llm?.apiKey || process.env.LLM_API_KEY || "",
        baseUrl: raw.settings?.llm?.baseUrl || process.env.LLM_BASE_URL || DEFAULT_LLM.baseUrl,
        chatModel: raw.settings?.llm?.chatModel || process.env.LLM_CHAT_MODEL || DEFAULT_LLM.chatModel,
      },
      enabledPeaks: raw.settings?.enabledPeaks?.length
        ? raw.settings.enabledPeaks
        : defaultSettings.enabledPeaks,
    },
    accounts,
    posts: (raw.posts ?? []).map((p) => ({ ...p, campaignId: p.campaignId ?? null })),
    variants: raw.variants ?? [],
    oauthPending: raw.oauthPending ?? null,
    campaigns: raw.campaigns?.length ? raw.campaigns : [seedCampaign()],
    leads: raw.leads ?? [],
  };
}

export function writeStore(store: Store) {
  ensure();
  writeFileSync(DATA_FILE, JSON.stringify(store, null, 2));
}

export function mutateStore<T>(fn: (store: Store) => T): T {
  const store = readStore();
  const result = fn(store);
  writeStore(store);
  return result;
}

export function nid(prefix: string) {
  return `${prefix}_${randomUUID().slice(0, 8)}`;
}

export function getAccount(store: Store, platform: PlatformId) {
  return store.accounts.find((a) => a.platform === platform) ?? null;
}

export function upsertPost(
  partial: Partial<CanonicalPost> & { title: string; body: string },
) {
  return mutateStore((store) => {
    const now = new Date().toISOString();
    if (partial.id) {
      const existing = store.posts.find((p) => p.id === partial.id);
      if (existing) {
        Object.assign(existing, partial, { updatedAt: now });
        return existing;
      }
    }
    const post: CanonicalPost = {
      id: partial.id || nid("post"),
      title: partial.title,
      body: partial.body,
      tags: partial.tags ?? [],
      coverImage: partial.coverImage ?? "",
      originalStatement: partial.originalStatement ?? false,
      campaignId: partial.campaignId ?? null,
      createdAt: now,
      updatedAt: now,
    };
    store.posts.unshift(post);
    return post;
  });
}
