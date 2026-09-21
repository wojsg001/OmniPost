import { createHmac, randomUUID } from "crypto";
import type { Account, PlatformId, PublishResult } from "../types";

export interface PublishPayload {
  title?: string;
  text: string;
  html?: string;
  digest?: string;
  tags: string[];
  coverImage?: string;
  original?: boolean;
}

export interface PlatformPublisher {
  id: PlatformId;
  publish(account: Account, payload: PublishPayload): Promise<PublishResult>;
}

export function isDryRun() {
  return process.env.OMNIPOST_DRY_RUN !== "false";
}

export function mockResult(platform: PlatformId, payload: PublishPayload): PublishResult {
  return {
    ok: true,
    dryRun: true,
    remoteId: `mock_${platform}_${randomUUID().slice(0, 8)}`,
    url: `https://omnipost.local/preview/${platform}`,
    message: `已模拟发布到 ${platform}（${payload.text.slice(0, 24)}…）`,
  };
}

export async function signedRequest(
  url: string,
  method: string,
  oauth: { key: string; secret: string; token: string; tokenSecret: string },
  extra: Record<string, string> = {},
) {
  const nonce = randomUUID().replaceAll("-", "");
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const params: Record<string, string> = {
    oauth_consumer_key: oauth.key,
    oauth_nonce: nonce,
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: timestamp,
    oauth_token: oauth.token,
    oauth_version: "1.0",
    ...extra,
  };
  const base = Object.keys(params)
    .sort()
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`)
    .join("&");
  const signatureBase = `${method}&${encodeURIComponent(url)}&${encodeURIComponent(base)}`;
  const signingKey = `${encodeURIComponent(oauth.secret)}&${encodeURIComponent(oauth.tokenSecret)}`;
  const signature = createHmac("sha1", signingKey).update(signatureBase).digest("base64");
  const header = Object.entries({ ...params, oauth_signature: signature })
    .map(([k, v]) => `${k}="${encodeURIComponent(v)}"`)
    .join(", ");
  return fetch(url, {
    method,
    headers: { Authorization: `OAuth ${header}`, "Content-Type": "application/json" },
    body: method === "POST" ? JSON.stringify(extra) : undefined,
  });
}
