import type { Campaign, PlatformId } from "../types";
import { publicOrigin } from "../platforms/bind";

export function campaignUrl(campaign: Campaign, req?: Request) {
  return `${publicOrigin(req)}/go/${campaign.slug}`;
}

export function ctaFor(platform: PlatformId, campaign: Campaign, req?: Request) {
  const url = campaignUrl(campaign, req);
  switch (platform) {
    case "weibo":
      return `评论「${campaign.keyword}」领${campaign.offer}`;
    case "wechat_oa":
      return `领取 ${campaign.offer}：加微信 ${campaign.wechat}，或打开 ${url}`;
    case "xiaohongshu":
      return `💬 评论「${campaign.keyword}」把资料发给你\n加微信 ${campaign.wechat}`;
    case "x":
      return `${campaign.cta}\n${url}`;
    case "facebook":
      return `${campaign.cta}\n留资：${url}`;
    case "instagram":
      return `Link in bio / ${url}\nDM “${campaign.keyword}”`;
  }
}
