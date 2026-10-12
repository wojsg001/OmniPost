import { NextResponse } from "next/server";
import { mutateStore } from "@/lib/db";
import { publicOrigin } from "@/lib/platforms/bind";
import { authorizeUrl } from "@/lib/platforms/oauth";
import { PLATFORM_IDS, type PlatformId } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: { platform: string } }) {
  const platform = params.platform as PlatformId;
  if (!PLATFORM_IDS.includes(platform)) {
    return NextResponse.json({ error: "未知平台" }, { status: 400 });
  }
  const account = mutateStore((store) => store.accounts.find((item) => item.platform === platform));
  if (!account) return NextResponse.json({ error: "账号不存在" }, { status: 404 });
  try {
    const started = authorizeUrl(platform, account, req);
    mutateStore((store) => {
      store.oauthPending = {
        state: started.state,
        platform,
        verifier: started.verifier,
        createdAt: new Date().toISOString(),
      };
    });
    return NextResponse.redirect(started.url);
  } catch (error) {
    const message = error instanceof Error ? error.message : "无法开始授权";
    return NextResponse.redirect(`${publicOrigin(req)}/platforms?error=${encodeURIComponent(message)}`);
  }
}
