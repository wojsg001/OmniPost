import type { PlatformId } from "../types";

export interface BindField {
  key: string;
  label: string;
  secret?: boolean;
  placeholder?: string;
  hint?: string;
}

export interface BindSpec {
  docs: string;
  oauth: boolean;
  oauthHint: string;
  fields: BindField[];
  required: string[];
}

export const BIND_SPECS: Record<PlatformId, BindSpec> = {
  weibo: {
    docs: "https://open.weibo.com",
    oauth: true,
    oauthHint: "用微博开放平台 App Key / Secret 跳转授权，登录你的微博账号。",
    fields: [
      { key: "displayName", label: "显示名称", placeholder: "例如 @你的微博" },
      { key: "appKey", label: "App Key", hint: "开放平台应用" },
      { key: "appSecret", label: "App Secret", secret: true },
      { key: "accessToken", label: "Access Token", secret: true, hint: "也可授权后自动写入" },
    ],
    required: ["accessToken"],
  },
  wechat_oa: {
    docs: "https://developers.weixin.qq.com/doc/offiaccount/Getting_Started/Overview.html",
    oauth: false,
    oauthHint: "公众号发文走服务端接口，填写已认证公众号的 AppID / AppSecret。",
    fields: [
      { key: "displayName", label: "公众号名称", placeholder: "例如 今晚吃什么" },
      { key: "appId", label: "AppID" },
      { key: "appSecret", label: "AppSecret", secret: true },
    ],
    required: ["appId", "appSecret"],
  },
  xiaohongshu: {
    docs: "https://open.xiaohongshu.com",
    oauth: false,
    oauthHint: "小红书开放平台需专业号申请。获批后把 Access Token 贴进来。",
    fields: [
      { key: "displayName", label: "账号名称", placeholder: "小红书昵称" },
      { key: "appId", label: "App ID" },
      { key: "appSecret", label: "App Secret", secret: true },
      { key: "accessToken", label: "Access Token", secret: true },
    ],
    required: ["accessToken"],
  },
  x: {
    docs: "https://developer.x.com/en/portal/dashboard",
    oauth: true,
    oauthHint: "用 X Developer Portal 的 Client ID / Secret 授权你的账号（OAuth 2.0）。",
    fields: [
      { key: "displayName", label: "显示名称", placeholder: "@handle" },
      { key: "apiKey", label: "API Key / Client ID" },
      { key: "apiSecret", label: "API Secret / Client Secret", secret: true },
      { key: "accessToken", label: "Access Token", secret: true },
      { key: "accessSecret", label: "Access Token Secret（OAuth 1.0a）", secret: true },
    ],
    required: ["accessToken"],
  },
  facebook: {
    docs: "https://developers.facebook.com/apps/",
    oauth: true,
    oauthHint: "用 Facebook App 授权你的主页，会写入 Page Token。",
    fields: [
      { key: "displayName", label: "主页名称" },
      { key: "appId", label: "App ID" },
      { key: "appSecret", label: "App Secret", secret: true },
      { key: "pageId", label: "Page ID" },
      { key: "pageToken", label: "Page Access Token", secret: true },
    ],
    required: ["pageId", "pageToken"],
  },
  instagram: {
    docs: "https://developers.facebook.com/docs/instagram-api",
    oauth: true,
    oauthHint: "Instagram 专业账号通过 Facebook 授权，绑定后写入 IG User ID。",
    fields: [
      { key: "displayName", label: "账号名称" },
      { key: "appId", label: "Facebook App ID" },
      { key: "appSecret", label: "Facebook App Secret", secret: true },
      { key: "userId", label: "Instagram User ID" },
      { key: "accessToken", label: "Access Token", secret: true },
    ],
    required: ["userId", "accessToken"],
  },
};

export function publicOrigin(req?: Request) {
  if (process.env.OMNIPOST_BASE_URL) return process.env.OMNIPOST_BASE_URL.replace(/\/$/, "");
  if (req) {
    const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
    const proto = req.headers.get("x-forwarded-proto") || "http";
    if (host) return `${proto}://${host}`;
  }
  return "http://localhost:3000";
}

export function callbackUrl(platform: PlatformId, req?: Request) {
  return `${publicOrigin(req)}/api/oauth/${platform}/callback`;
}
