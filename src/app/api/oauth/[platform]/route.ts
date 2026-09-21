import { NextResponse } from "next/server";
import { authorizeUrl } from "@/lib/platforms/oauth";
import { publicOrigin } from "@/lib/platforms/bind";
import { mutateStore } from "@/lib/db";
import { PLATFORM_IDS, type PlatformId } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: { platform: string } }) {
  const platform = params.platform as PlatformId;
  if (!PLATFORM_IDS.includes(platform)) {
    return NextResponse.json({ error: "未知平台" }, { status: 400 });
  }
  const account = mutateStore((store) => store.accounts.find((a) => a.platform === platform));
  if (!account) return NextResponse.json({ error: "账号不存在" }, { status: 404 });
  try {
    const url = authorizeUrl(platform, account, req);
    return NextResponse.redirect(url);
  } catch (error) {
    const message = error instanceof Error ? error.message : "无法开始授权";
    return NextResponse.redirect(
      `${publicOrigin(req)}/platforms?error=${encodeURIComponent(message)}`,
    );
  }
}
