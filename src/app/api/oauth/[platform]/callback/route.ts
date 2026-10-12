import { NextResponse } from "next/server";
import { mutateStore } from "@/lib/db";
import { publicOrigin } from "@/lib/platforms/bind";
import { applyOAuthResult, exchangeCode, pendingFresh } from "@/lib/platforms/oauth";
import { PLATFORM_IDS, type PlatformId } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: { platform: string } }) {
  const platform = params.platform as PlatformId;
  const origin = publicOrigin(req);
  if (!PLATFORM_IDS.includes(platform)) {
    return NextResponse.redirect(`${origin}/platforms?error=${encodeURIComponent("未知平台")}`);
  }
  const url = new URL(req.url);
  const err = url.searchParams.get("error_description") || url.searchParams.get("error");
  if (err) return NextResponse.redirect(`${origin}/platforms?error=${encodeURIComponent(err)}`);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const pending = mutateStore((store) => store.oauthPending);
  if (!code || !state || !pendingFresh(pending, platform) || pending?.state !== state) {
    return NextResponse.redirect(`${origin}/platforms?error=${encodeURIComponent("授权状态失效，请重试")}`);
  }
  try {
    const exchanged = await exchangeCode(platform, code, req);
    if (exchanged.kind === "choose") {
      mutateStore((store) => {
        if (!store.oauthPending || store.oauthPending.state !== state) return;
        store.oauthPending = {
          state,
          platform,
          createdAt: store.oauthPending.createdAt,
          choices: exchanged.choices,
          hint: exchanged.hint,
        };
      });
      return NextResponse.redirect(`${origin}/platforms?pick=${platform}`);
    }
    mutateStore((store) => {
      applyOAuthResult(store, platform, exchanged.result);
    });
    return NextResponse.redirect(`${origin}/platforms?bound=${platform}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "授权失败";
    return NextResponse.redirect(`${origin}/platforms?error=${encodeURIComponent(message)}`);
  }
}
