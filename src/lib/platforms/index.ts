import type { PlatformId } from "../types";
import type { PlatformPublisher } from "./base";
import { weiboPublisher } from "./weibo";
import { wechatPublisher } from "./wechat";
import { xiaohongshuPublisher } from "./xiaohongshu";
import { xPublisher } from "./x";
import { facebookPublisher } from "./facebook";
import { instagramPublisher } from "./instagram";

export const publishers: Record<PlatformId, PlatformPublisher> = {
  weibo: weiboPublisher,
  wechat_oa: wechatPublisher,
  xiaohongshu: xiaohongshuPublisher,
  x: xPublisher,
  facebook: facebookPublisher,
  instagram: instagramPublisher,
};

export function getPublisher(id: PlatformId) {
  return publishers[id];
}
