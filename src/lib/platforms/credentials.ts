import type { Account, AccountCredentials, PlatformId } from "../types";
import { BIND_SPECS } from "./bind";

export function cred(account: Account | null | undefined, key: string, envKey?: string) {
  const fromAccount = account?.credentials?.[key]?.trim();
  if (fromAccount) return fromAccount;
  if (envKey) return (process.env[envKey] || "").trim();
  return "";
}

export function isBound(account: Account | null | undefined) {
  if (!account) return false;
  if (account.status === "connected" && Object.values(account.credentials || {}).some(Boolean)) {
    return true;
  }
  const spec = BIND_SPECS[account.platform];
  return spec.required.every((key) => Boolean(account.credentials?.[key] || envFallback(account.platform, key)));
}

function envFallback(platform: PlatformId, key: string) {
  const map: Partial<Record<PlatformId, Record<string, string>>> = {
    weibo: { accessToken: "WEIBO_ACCESS_TOKEN", appKey: "WEIBO_APP_KEY", appSecret: "WEIBO_APP_SECRET" },
    wechat_oa: { appId: "WECHAT_APP_ID", appSecret: "WECHAT_APP_SECRET" },
    xiaohongshu: { accessToken: "XHS_ACCESS_TOKEN", appId: "XHS_APP_ID", appSecret: "XHS_APP_SECRET" },
    x: {
      apiKey: "X_API_KEY",
      apiSecret: "X_API_SECRET",
      accessToken: "X_ACCESS_TOKEN",
      accessSecret: "X_ACCESS_SECRET",
    },
    facebook: {
      appId: "FACEBOOK_APP_ID",
      appSecret: "FACEBOOK_APP_SECRET",
      pageId: "FACEBOOK_PAGE_ID",
      pageToken: "FACEBOOK_PAGE_TOKEN",
    },
    instagram: {
      appId: "FACEBOOK_APP_ID",
      appSecret: "FACEBOOK_APP_SECRET",
      userId: "INSTAGRAM_USER_ID",
      accessToken: "INSTAGRAM_ACCESS_TOKEN",
    },
  };
  const envKey = map[platform]?.[key];
  return envKey ? process.env[envKey] : "";
}

export function mergeCredentials(current: AccountCredentials, incoming: AccountCredentials) {
  const next = { ...current };
  for (const [key, value] of Object.entries(incoming)) {
    if (value === undefined) continue;
    const trimmed = value.trim();
    if (!trimmed) continue;
    if (trimmed.includes("•") || trimmed.includes("*")) continue;
    next[key] = trimmed;
  }
  return next;
}

export function maskSecret(value: string) {
  if (!value) return "";
  if (value.length <= 6) return "••••";
  return `${value.slice(0, 2)}••••${value.slice(-4)}`;
}

export function publicCredentials(credentials: AccountCredentials, platform: PlatformId) {
  const spec = BIND_SPECS[platform];
  const out: AccountCredentials = {};
  for (const field of spec.fields) {
    const raw = credentials[field.key] || envFallback(platform, field.key) || "";
    if (!raw) continue;
    out[field.key] = field.secret ? maskSecret(raw) : raw;
  }
  return out;
}
