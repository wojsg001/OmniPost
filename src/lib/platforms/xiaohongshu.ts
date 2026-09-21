import type { Account } from "../types";
import { cred } from "./credentials";
import { isDryRun, mockResult, type PlatformPublisher, type PublishPayload } from "./base";

export const xiaohongshuPublisher: PlatformPublisher = {
  id: "xiaohongshu",
  async publish(account: Account, payload: PublishPayload) {
    const token = cred(account, "accessToken", "XHS_ACCESS_TOKEN");
    if (isDryRun() || !token) return mockResult("xiaohongshu", payload);
    const res = await fetch("https://open.xiaohongshu.com/api/note/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        title: payload.title,
        content: payload.text,
        images: payload.coverImage ? [payload.coverImage] : [],
        tags: payload.tags,
      }),
    });
    const data = (await res.json()) as { data?: { note_id?: string }; msg?: string };
    if (!res.ok || !data.data?.note_id) {
      return {
        ok: false,
        dryRun: false,
        message: data.msg || "小红书开放平台发帖失败，可改用复制文案手动发布",
      };
    }
    return {
      ok: true,
      dryRun: false,
      remoteId: data.data.note_id,
      message: `已发到小红书 @${account.displayName}`,
    };
  },
};
