import { NextResponse } from "next/server";
import { mutateStore } from "@/lib/db";
import { publicOrigin } from "@/lib/platforms/bind";
import { isBound } from "@/lib/platforms/credentials";
import { exchangeCode } from "@/lib/platforms/oauth";
import { PLATFORM_IDS, type PlatformId } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: { platform: string } }) {
  const platform = params.platform as PlatformId;
  const origin = publicOrigin(req);
  if (!PLATFORM_IDS.includes(platform)) {
    return NextResponse.redirect(`${origin}/platforms?error=未知平台`);
  }
  const url = new URL(req.url);
  const err = url.searchParams.get("error_description") || url.searchParams.get("error");
  if (err) return NextResponse.redirect(`${origin}/platforms?error=${encodeURIComponent(err)}`);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const pending = mutateStore((s) => s.oauthPending);
  if (!code || !state || pending?.state !== state || pending.platform !== platform) {
    return NextResponse.redirect(`${origin}/platforms?error=${encodeURIComponent("授权状态失效，请重试")}`);
  }
  try {
    const result = await exchangeCode(platform, code, req);
    mutateStore((store) => {
      const account = store.accounts.find((a) => a.platform === platform);
      if (!account) return;
      account.credentials = {
        ...account.credentials,
        ...Object.fromEntries(
          Object.entries(result.credentials).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
        ),
      };
      account.displayName = result.displayName || account.displayName;
      account.profileUrl = result.profileUrl;
      account.bindMethod = "oauth";
      account.boundAt = new Date().toISOString();
      account.status = isBound(account) ? "connected" : "error";
      account.hint = "授权成功";
      account.updatedAt = new Date().toISOString();
      store.oauthPending = null;
    });
    return NextResponse.redirect(`${origin}/platforms?bound=${platform}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "授权失败";
    return NextResponse.redirect(`${origin}/platforms?error=${encodeURIComponent(message)}`);
  }
}
