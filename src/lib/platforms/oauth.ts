import { createHash, randomBytes } from "crypto";
import type { Account, PlatformId } from "../types";
import { BIND_SPECS, callbackUrl } from "./bind";
import { cred } from "./credentials";
import { mutateStore } from "../db";

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
    mutateStore((store) => {
      store.oauthPending = { state, platform, createdAt: new Date().toISOString() };
    });
    const url = new URL("https://api.weibo.com/oauth2/authorize");
    url.searchParams.set("client_id", appKey);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("redirect_uri", redirect);
    url.searchParams.set("state", state);
    return url.toString();
  }

  if (platform === "x") {
    const clientId = cred(account, "apiKey", "X_API_KEY");
    if (!clientId) throw new Error("请先填写 X 的 API Key / Client ID");
    const { verifier, challenge } = pkce();
    mutateStore((store) => {
      store.oauthPending = { state, platform, verifier, createdAt: new Date().toISOString() };
    });
    const url = new URL("https://twitter.com/i/oauth2/authorize");
    url.searchParams.set("response_type", "code");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", redirect);
    url.searchParams.set("scope", "tweet.read tweet.write users.read offline.access");
    url.searchParams.set("state", state);
    url.searchParams.set("code_challenge", challenge);
    url.searchParams.set("code_challenge_method", "S256");
    return url.toString();
  }

  if (platform === "facebook" || platform === "instagram") {
    const appId = cred(account, "appId", "FACEBOOK_APP_ID");
    if (!appId) throw new Error("请先填写 Facebook App ID");
    mutateStore((store) => {
      store.oauthPending = { state, platform, createdAt: new Date().toISOString() };
    });
    const url = new URL("https://www.facebook.com/v21.0/dialog/oauth");
    url.searchParams.set("client_id", appId);
    url.searchParams.set("redirect_uri", redirect);
    url.searchParams.set("state", state);
    url.searchParams.set(
      "scope",
      "pages_show_list,pages_manage_posts,pages_read_engagement,instagram_basic,instagram_content_publish",
    );
    return url.toString();
  }

  throw new Error("该平台暂不支持授权登录");
}

export async function exchangeCode(platform: PlatformId, code: string, req: Request) {
  const account = mutateStore((store) => store.accounts.find((a) => a.platform === platform));
  if (!account) throw new Error("账号不存在");
  const redirect = callbackUrl(platform, req);

  if (platform === "weibo") {
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
    const data = (await res.json()) as { access_token?: string; uid?: string; error?: string };
    if (!data.access_token) throw new Error(data.error || "微博授权失败");
    let name = account.displayName;
    const me = await fetch(
      `https://api.weibo.com/2/users/show.json?access_token=${data.access_token}&uid=${data.uid || ""}`,
    ).then((r) => r.json() as Promise<{ screen_name?: string; profile_url?: string }>);
    if (me.screen_name) name = `@${me.screen_name}`;
    return {
      displayName: name,
      credentials: { accessToken: data.access_token, userId: data.uid || "" },
      profileUrl: me.profile_url ? `https://weibo.com/${me.profile_url}` : null,
    };
  }

  if (platform === "x") {
    const pending = mutateStore((s) => s.oauthPending);
    const clientId = cred(account, "apiKey", "X_API_KEY");
    const secret = cred(account, "apiSecret", "X_API_SECRET");
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
    const data = (await res.json()) as {
      access_token?: string;
      refresh_token?: string;
      error_description?: string;
    };
    if (!data.access_token) throw new Error(data.error_description || "X 授权失败");
    const me = await fetch("https://api.twitter.com/2/users/me", {
      headers: { Authorization: `Bearer ${data.access_token}` },
    }).then((r) => r.json() as Promise<{ data?: { username?: string; id?: string } }>);
    const username = me.data?.username ? `@${me.data.username}` : account.displayName;
    return {
      displayName: username,
      credentials: {
        accessToken: data.access_token,
        refreshToken: data.refresh_token || "",
        userId: me.data?.id || "",
      },
      profileUrl: me.data?.username ? `https://x.com/${me.data.username}` : null,
    };
  }

  if (platform === "facebook" || platform === "instagram") {
    const appId = cred(account, "appId", "FACEBOOK_APP_ID");
    const secret = cred(account, "appSecret", "FACEBOOK_APP_SECRET");
    const tokenUrl = new URL("https://graph.facebook.com/v21.0/oauth/access_token");
    tokenUrl.searchParams.set("client_id", appId);
    tokenUrl.searchParams.set("client_secret", secret);
    tokenUrl.searchParams.set("redirect_uri", redirect);
    tokenUrl.searchParams.set("code", code);
    const token = await fetch(tokenUrl).then(
      (r) => r.json() as Promise<{ access_token?: string; error?: { message?: string } }>,
    );
    if (!token.access_token) throw new Error(token.error?.message || "Facebook 授权失败");
    const pages = await fetch(
      `https://graph.facebook.com/v21.0/me/accounts?access_token=${token.access_token}`,
    ).then((r) => r.json() as Promise<{ data?: { id: string; name: string; access_token: string }[] }>);
    const page = pages.data?.[0];
    if (!page) throw new Error("未找到可管理的 Facebook 主页");
    if (platform === "facebook") {
      return {
        displayName: page.name,
        credentials: { pageId: page.id, pageToken: page.access_token },
        profileUrl: `https://facebook.com/${page.id}`,
      };
    }
    const ig = await fetch(
      `https://graph.facebook.com/v21.0/${page.id}?fields=instagram_business_account&access_token=${page.access_token}`,
    ).then((r) => r.json() as Promise<{ instagram_business_account?: { id: string } }>);
    const igId = ig.instagram_business_account?.id;
    if (!igId) throw new Error("该主页未绑定 Instagram 专业账号");
    const igMe = await fetch(
      `https://graph.facebook.com/v21.0/${igId}?fields=username&access_token=${page.access_token}`,
    ).then((r) => r.json() as Promise<{ username?: string }>);
    return {
      displayName: igMe.username ? `@${igMe.username}` : page.name,
      credentials: { userId: igId, accessToken: page.access_token },
      profileUrl: igMe.username ? `https://www.instagram.com/${igMe.username}/` : null,
    };
  }

  throw new Error("不支持的授权回调");
}
