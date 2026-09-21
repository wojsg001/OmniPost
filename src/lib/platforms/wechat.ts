import type { Account } from "../types";
import { cred } from "./credentials";
import { isDryRun, mockResult, type PlatformPublisher, type PublishPayload } from "./base";

async function wechatToken(account: Account) {
  const appid = cred(account, "appId", "WECHAT_APP_ID");
  const secret = cred(account, "appSecret", "WECHAT_APP_SECRET");
  if (!appid || !secret) return null;
  const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appid}&secret=${secret}`;
  const res = await fetch(url, { cache: "no-store" });
  const data = (await res.json()) as { access_token?: string; errmsg?: string };
  return data.access_token ?? null;
}

export const wechatPublisher: PlatformPublisher = {
  id: "wechat_oa",
  async publish(account: Account, payload: PublishPayload) {
    const appId = cred(account, "appId", "WECHAT_APP_ID");
    if (isDryRun() || !appId) return mockResult("wechat_oa", payload);
    const token = await wechatToken(account);
    if (!token) {
      return { ok: false, dryRun: false, message: "无法获取公众号 access_token" };
    }
    const res = await fetch(`https://api.weixin.qq.com/cgi-bin/draft/add?access_token=${token}`, {
      method: "POST",
      body: JSON.stringify({
        articles: [
          {
            title: payload.title || "未命名",
            author: account.displayName,
            digest: payload.digest || payload.text.slice(0, 54),
            content: payload.html || `<p>${payload.text}</p>`,
            content_source_url: "",
            thumb_media_id: "",
            need_open_comment: 1,
            only_fans_can_comment: 0,
          },
        ],
      }),
    });
    const data = (await res.json()) as { media_id?: string; errmsg?: string };
    if (!data.media_id) {
      return {
        ok: false,
        dryRun: false,
        message: data.errmsg || "公众号草稿创建失败（封面需先上传为永久素材 thumb_media_id）",
      };
    }
    return {
      ok: true,
      dryRun: false,
      remoteId: data.media_id,
      message: `已写入公众号草稿箱，请在后台群发 @${account.displayName}`,
    };
  },
};
