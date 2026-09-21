import type { Account } from "../types";
import { cred } from "./credentials";
import { isDryRun, mockResult, type PlatformPublisher, type PublishPayload } from "./base";

export const instagramPublisher: PlatformPublisher = {
  id: "instagram",
  async publish(account: Account, payload: PublishPayload) {
    const igUser = cred(account, "userId", "INSTAGRAM_USER_ID");
    const token = cred(account, "accessToken", "INSTAGRAM_ACCESS_TOKEN");
    if (isDryRun() || !igUser || !token) return mockResult("instagram", payload);
    if (!payload.coverImage) {
      return { ok: false, dryRun: false, message: "Instagram 需要可公开访问的图片 URL" };
    }
    const containerRes = await fetch(`https://graph.facebook.com/v21.0/${igUser}/media`, {
      method: "POST",
      body: new URLSearchParams({
        image_url: payload.coverImage,
        caption: payload.text,
        access_token: token,
      }),
    });
    const container = (await containerRes.json()) as { id?: string; error?: { message?: string } };
    if (!container.id) {
      return { ok: false, dryRun: false, message: container.error?.message || "创建 Instagram 容器失败" };
    }
    const pubRes = await fetch(`https://graph.facebook.com/v21.0/${igUser}/media_publish`, {
      method: "POST",
      body: new URLSearchParams({ creation_id: container.id, access_token: token }),
    });
    const pub = (await pubRes.json()) as { id?: string; error?: { message?: string } };
    if (!pub.id) {
      return { ok: false, dryRun: false, message: pub.error?.message || "Instagram 发布失败" };
    }
    return {
      ok: true,
      dryRun: false,
      remoteId: pub.id,
      url: `https://www.instagram.com/p/${pub.id}/`,
      message: `已发到 Instagram @${account.displayName}`,
    };
  },
};
