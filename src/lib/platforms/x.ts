import type { Account } from "../types";
import { cred } from "./credentials";
import { isDryRun, mockResult, signedRequest, type PlatformPublisher, type PublishPayload } from "./base";

export const xPublisher: PlatformPublisher = {
  id: "x",
  async publish(account: Account, payload: PublishPayload) {
    const bearer = cred(account, "accessToken", "X_ACCESS_TOKEN");
    const key = cred(account, "apiKey", "X_API_KEY");
    const secret = cred(account, "apiSecret", "X_API_SECRET");
    const tokenSecret = cred(account, "accessSecret", "X_ACCESS_SECRET");
    if (isDryRun()) return mockResult("x", payload);
    if (bearer && !tokenSecret) {
      const res = await fetch("https://api.twitter.com/2/tweets", {
        method: "POST",
        headers: { Authorization: `Bearer ${bearer}`, "Content-Type": "application/json" },
        body: JSON.stringify({ text: payload.text }),
      });
      const data = (await res.json()) as { data?: { id?: string }; detail?: string; title?: string };
      if (!res.ok || !data.data?.id) {
        return { ok: false, dryRun: false, message: data.detail || data.title || `X 发布失败 ${res.status}` };
      }
      return {
        ok: true,
        dryRun: false,
        remoteId: data.data.id,
        url: `https://x.com/i/web/status/${data.data.id}`,
        message: `已发到 X @${account.displayName}`,
      };
    }
    if (!key || !secret || !bearer || !tokenSecret) return mockResult("x", payload);
    const res = await signedRequest(
      "https://api.twitter.com/2/tweets",
      "POST",
      { key, secret, token: bearer, tokenSecret },
      { text: payload.text },
    );
    const data = (await res.json()) as { data?: { id?: string }; detail?: string; title?: string };
    if (!res.ok || !data.data?.id) {
      return { ok: false, dryRun: false, message: data.detail || data.title || `X 发布失败 ${res.status}` };
    }
    return {
      ok: true,
      dryRun: false,
      remoteId: data.data.id,
      url: `https://x.com/i/web/status/${data.data.id}`,
      message: `已发到 X @${account.displayName}`,
    };
  },
};
