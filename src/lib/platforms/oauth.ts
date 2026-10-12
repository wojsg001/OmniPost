import { createHash, randomBytes } from "crypto";
import { readStore } from "../db";
import type { Account, OAuthChoice, OAuthPending, PlatformId, Store } from "../types";
import { BIND_SPECS, callbackUrl } from "./bind";
import { cred, isBound } from "./credentials";

const PENDING_MS = 30 * 60 * 1000;
const GRAPH = "https://graph.facebook.com/v21.0";

export interface OAuthBindResult {
  displayName: string;
  credentials: Record<string, string>;
  profileUrl: string | null;
  hint?: string;
}

export type OAuthExchange =
  | { kind: "bound"; result: OAuthBindResult }
  | { kind: "choose"; choices: OAuthChoice[]; hint?: string };

interface FbPage {
  id: string;
  name: string;
  access_token: string;
  instagram_business_account?: { id: string; username?: string };
}

function b64url(buf: Buffer) {
  return buf.toString("base64").replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

export function newOAuthState() {
  return randomBytes(16).toString("hex");
}

export function pkce() {
  const verifier = b64url(randomBytes(32));
  const challenge = b64url(createHash("sha256").update(verifier).digest());
  return { verifier, challenge };
}

export function pendingFresh(pending: OAuthPending | null, platform?: PlatformId) {
  if (!pending) return false;
  if (platform && pending.platform !== platform) return false;
  const age = Date.now() - new Date(pending.createdAt).getTime();
  return age >= 0 && age < PENDING_MS;
}

export function publicChoices(pending: OAuthPending | null, platform: PlatformId) {
  if (!pendingFresh(pending, platform) || !pending?.choices?.length) return [];
  return pending.choices.map((choice) => ({
    id: choice.id,
    label: choice.username ? `@${choice.username}` : choice.name,
    detail: choice.username ? choice.name : "",
  }));
}

export function applyOAuthResult(store: Store, platform: PlatformId, result: OAuthBindResult) {
  const account = store.accounts.find((item) => item.platform === platform);
  if (!account) return null;
  account.credentials = {
    ...account.credentials,
    ...Object.fromEntries(
      Object.entries(result.credentials).filter((entry): entry is [string, string] => typeof entry[1] === "string" && entry[1].length > 0),
    ),
  };
  account.displayName = result.displayName || account.displayName;
  account.profileUrl = result.profileUrl;
  account.bindMethod = "oauth";
  account.boundAt = new Date().toISOString();
  account.status = isBound(account) ? "connected" : "error";
  account.hint = result.hint || "授权成功";
  account.updatedAt = new Date().toISOString();
  store.oauthPending = null;
  return account;
}

function metaApp(platform: "facebook" | "instagram") {
  const store = readStore();
  const account = store.accounts.find((item) => item.platform === platform);
  let appId = cred(account, "appId", "FACEBOOK_APP_ID");
  let secret = cred(account, "appSecret", "FACEBOOK_APP_SECRET");
  if (platform === "instagram" && (!appId || !secret)) {
    const facebook = store.accounts.find((item) => item.platform === "facebook");
    appId = appId || cred(facebook, "appId");
    secret = secret || cred(facebook, "appSecret");
  }
  return { appId, secret };
}

function facebookResult(choice: OAuthChoice, hint?: string): OAuthBindResult {
  return {
    displayName: choice.name,
    credentials: { pageId: choice.id, pageToken: choice.token },
    profileUrl: `https://facebook.com/${choice.id}`,
    hint,
  };
}

function instagramResult(choice: OAuthChoice, hint?: string): OAuthBindResult {
  return {
    displayName: choice.username ? `@${choice.username}` : choice.name,
    credentials: { userId: choice.id, accessToken: choice.token },
    profileUrl: choice.username ? `https://www.instagram.com/${choice.username}/` : null,
    hint,
  };
}

export function bindChoice(platform: PlatformId, choice: OAuthChoice): OAuthBindResult {
  if (platform === "facebook") return facebookResult(choice);
  if (platform === "instagram") return instagramResult(choice);
  throw new Error("该平台不需要选择账号");
}

export function authorizeUrl(platform: PlatformId, account: Account, originReq: Request) {
  const redirect = callbackUrl(platform, originReq);
  const state = newOAuthState();
  const spec = BIND_SPECS[platform];
  if (!spec.oauth) {
    throw new Error(`${platform} 不支持网页授权，请手动填写凭证`);
  }

  if (platform === "weibo") {
    const appKey = cred(account, "appKey", "WEIBO_APP_KEY");
    if (!appKey) throw new Error("请先填写微博 App Key");
    return { redirect, state, url: weiboAuthorize(appKey, redirect, state) };
  }

  if (platform === "x") {
    const clientId = cred(account, "apiKey", "X_API_KEY");
    if (!clientId) throw new Error(`请先填写 X 的 Client ID，并把回调地址加入应用：${redirect}`);
    const { verifier, challenge } = pkce();
    const url = new URL("https://twitter.com/i/oauth2/authorize");
    url.searchParams.set("response_type", "code");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", redirect);
    url.searchParams.set("scope", "tweet.read tweet.write users.read offline.access");
    url.searchParams.set("state", state);
    url.searchParams.set("code_challenge", challenge);
    url.searchParams.set("code_challenge_method", "S256");
    return { redirect, state, verifier, url: url.toString() };
  }

  if (platform === "facebook" || platform === "instagram") {
    const { appId } = metaApp(platform);
    if (!appId) {
      throw new Error(
        platform === "instagram"
          ? `请先填写 Facebook App ID（Instagram 卡片或 Facebook 卡片均可），并把回调地址加入应用：${redirect}`
          : `请先填写 Facebook App ID，并把回调地址加入应用：${redirect}`,
      );
    }
    const url = new URL("https://www.facebook.com/v21.0/dialog/oauth");
    url.searchParams.set("client_id", appId);
    url.searchParams.set("redirect_uri", redirect);
    url.searchParams.set("state", state);
    url.searchParams.set("response_type", "code");
    url.searchParams.set(
      "scope",
      platform === "instagram"
        ? "pages_show_list,pages_read_engagement,instagram_basic,instagram_content_publish"
        : "pages_show_list,pages_manage_posts,pages_read_engagement",
    );
    return { redirect, state, url: url.toString() };
  }

  throw new Error("该平台暂不支持授权登录");
}

function weiboAuthorize(appKey: string, redirect: string, state: string) {
  const url = new URL("https://api.weibo.com/oauth2/authorize");
  url.searchParams.set("client_id", appKey);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", redirect);
  url.searchParams.set("state", state);
  return url.toString();
}

async function readJson<T>(res: Response): Promise<T> {
  return (await res.json()) as T;
}

export async function exchangeCode(platform: PlatformId, code: string, req: Request): Promise<OAuthExchange> {
  const store = readStore();
  const account = store.accounts.find((item) => item.platform === platform);
  if (!account) throw new Error("账号不存在");
  const redirect = callbackUrl(platform, req);

  if (platform === "weibo") return { kind: "bound", result: await exchangeWeibo(account, code, redirect) };
  if (platform === "x") return { kind: "bound", result: await exchangeX(account, code, redirect) };
  if (platform === "facebook" || platform === "instagram") return exchangeMeta(platform, code, redirect);
  throw new Error("不支持的授权回调");
}

async function exchangeWeibo(account: Account, code: string, redirect: string): Promise<OAuthBindResult> {
  const appKey = cred(account, "appKey", "WEIBO_APP_KEY");
  const secret = cred(account, "appSecret", "WEIBO_APP_SECRET");
  const body = new URLSearchParams({
    client_id: appKey,
    client_secret: secret,
    grant_type: "authorization_code",
    code,
    redirect_uri: redirect,
  });
  const res = await fetch("https://api.weibo.com/oauth2/access_token", { method: "POST", body });
  const data = await readJson<{ access_token?: string; uid?: string; error?: string }>(res);
  if (!data.access_token) throw new Error(data.error || "微博授权失败");
  let name = account.displayName;
  const me = await fetch(
    `https://api.weibo.com/2/users/show.json?access_token=${encodeURIComponent(data.access_token)}&uid=${encodeURIComponent(data.uid || "")}`,
  ).then((response) => readJson<{ screen_name?: string; profile_url?: string }>(response));
  if (me.screen_name) name = `@${me.screen_name}`;
  return {
    displayName: name,
    credentials: { accessToken: data.access_token, userId: data.uid || "" },
    profileUrl: me.profile_url ? `https://weibo.com/${me.profile_url}` : null,
  };
}

async function exchangeX(account: Account, code: string, redirect: string): Promise<OAuthBindResult> {
  const pending = readStore().oauthPending;
  const clientId = cred(account, "apiKey", "X_API_KEY");
  const secret = cred(account, "apiSecret", "X_API_SECRET");
  if (!clientId || !secret) throw new Error("请先填写 X 的 Client ID 和 Client Secret");
  const basic = Buffer.from(`${clientId}:${secret}`).toString("base64");
  const body = new URLSearchParams({
    code,
    grant_type: "authorization_code",
    client_id: clientId,
    redirect_uri: redirect,
    code_verifier: pending?.verifier || "",
  });
  const res = await fetch("https://api.twitter.com/2/oauth2/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const data = await readJson<{
    access_token?: string;
    refresh_token?: string;
    error_description?: string;
  }>(res);
  if (!data.access_token) throw new Error(data.error_description || "X 授权失败");
  const me = await fetch("https://api.twitter.com/2/users/me", {
    headers: { Authorization: `Bearer ${data.access_token}` },
  }).then((response) => readJson<{ data?: { username?: string; id?: string } }>(response));
  const username = me.data?.username;
  return {
    displayName: username ? `@${username}` : account.displayName,
    credentials: {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || "",
      userId: me.data?.id || "",
    },
    profileUrl: username ? `https://x.com/${username}` : null,
  };
}

async function exchangeMeta(platform: "facebook" | "instagram", code: string, redirect: string): Promise<OAuthExchange> {
  const { appId, secret } = metaApp(platform);
  if (!appId || !secret) throw new Error("请先填写 Facebook App ID 和 App Secret");
  const tokenUrl = new URL(`${GRAPH}/oauth/access_token`);
  tokenUrl.searchParams.set("client_id", appId);
  tokenUrl.searchParams.set("client_secret", secret);
  tokenUrl.searchParams.set("redirect_uri", redirect);
  tokenUrl.searchParams.set("code", code);
  const token = await fetch(tokenUrl).then((response) =>
    readJson<{ access_token?: string; error?: { message?: string } }>(response),
  );
  if (!token.access_token) throw new Error(token.error?.message || "Facebook 授权失败");

  let userToken = token.access_token;
  let hint: string | undefined;
  const longUrl = new URL(`${GRAPH}/oauth/access_token`);
  longUrl.searchParams.set("grant_type", "fb_exchange_token");
  longUrl.searchParams.set("client_id", appId);
  longUrl.searchParams.set("client_secret", secret);
  longUrl.searchParams.set("fb_exchange_token", token.access_token);
  const longLived = await fetch(longUrl).then((response) =>
    readJson<{ access_token?: string; error?: { message?: string } }>(response),
  );
  if (longLived.access_token) userToken = longLived.access_token;
  else hint = "已授权，但这是短期令牌，大约 1 小时后失效。请确认应用已开启 Facebook 登录后再授权一次。";

  const pagesUrl = new URL(`${GRAPH}/me/accounts`);
  pagesUrl.searchParams.set("fields", "id,name,access_token,instagram_business_account{id,username}");
  pagesUrl.searchParams.set("access_token", userToken);
  const pages = await fetch(pagesUrl).then((response) =>
    readJson<{ data?: FbPage[]; error?: { message?: string } }>(response),
  );
  if (pages.error?.message) throw new Error(pages.error.message);
  const list = (pages.data || []).filter((page) => page.id && page.access_token);
  if (platform === "facebook") {
    if (!list.length) throw new Error("未找到可管理的 Facebook 主页。请用主页管理员账号授权。");
    const choices = list.map((page) => ({ id: page.id, name: page.name, token: page.access_token }));
    if (choices.length === 1) return { kind: "bound", result: facebookResult(choices[0], hint) };
    return { kind: "choose", choices, hint };
  }
  const choices = list.flatMap((page) => {
    const ig = page.instagram_business_account;
    if (!ig?.id) return [];
    return [{ id: ig.id, name: page.name, token: page.access_token, username: ig.username || "" }];
  });
  if (!choices.length) throw new Error("这些主页都没有关联 Instagram 专业账号");
  if (choices.length === 1) return { kind: "bound", result: instagramResult(choices[0], hint) };
  return { kind: "choose", choices, hint };
}


