import type { Account } from "../types";
import { cred } from "./credentials";
import { isDryRun, mockResult, type PlatformPublisher, type PublishPayload } from "./base";

export const weiboPublisher: PlatformPublisher = {
  id: "weibo",
  async publish(account: Account, payload: PublishPayload) {
    const token = cred(account, "accessToken", "WEIBO_ACCESS_TOKEN");
    if (isDryRun() || !token) return mockResult("weibo", payload);
    const body = new URLSearchParams({
      access_token: token,
      status: payload.text.slice(0, 2000),
    });
    if (payload.coverImage) body.set("rip", payload.coverImage);
    const res = await fetch("https://api.weibo.com/2/statuses/share.json", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const data = (await res.json()) as { idstr?: string; error?: string };
    if (!res.ok || data.error) {
      return { ok: false, dryRun: false, message: data.error || `微博发布失败 ${res.status}` };
    }
    return {
      ok: true,
      dryRun: false,
      remoteId: data.idstr,
      url: `https://m.weibo.cn/detail/${data.idstr}`,
      message: `已发到微博 @${account.displayName}`,
    };
  },
};
