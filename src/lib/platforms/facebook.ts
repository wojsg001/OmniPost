import type { Account } from "../types";
import { cred } from "./credentials";
import { isDryRun, mockResult, type PlatformPublisher, type PublishPayload } from "./base";

export const facebookPublisher: PlatformPublisher = {
  id: "facebook",
  async publish(account: Account, payload: PublishPayload) {
    const pageId = cred(account, "pageId", "FACEBOOK_PAGE_ID");
    const token = cred(account, "pageToken", "FACEBOOK_PAGE_TOKEN");
    if (isDryRun() || !pageId || !token) return mockResult("facebook", payload);
    const body = new URLSearchParams({ message: payload.text, access_token: token });
    if (payload.coverImage) body.set("link", payload.coverImage);
    const res = await fetch(`https://graph.facebook.com/v21.0/${pageId}/feed`, {
      method: "POST",
      body,
    });
    const data = (await res.json()) as { id?: string; error?: { message?: string } };
    if (!data.id) {
      return { ok: false, dryRun: false, message: data.error?.message || "Facebook 发帖失败" };
    }
    return {
      ok: true,
      dryRun: false,
      remoteId: data.id,
      url: `https://facebook.com/${data.id}`,
      message: `已发到 Facebook @${account.displayName}`,
    };
  },
};
