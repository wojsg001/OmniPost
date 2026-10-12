import { NextResponse } from "next/server";
import { z } from "zod";
import { mutateStore, readStore } from "@/lib/db";
import { applyOAuthResult, bindChoice, pendingFresh, publicChoices } from "@/lib/platforms/oauth";
import { PLATFORM_IDS, type PlatformId } from "@/lib/types";

export const dynamic = "force-dynamic";

function parsePlatform(value: string): PlatformId | null {
  return PLATFORM_IDS.includes(value as PlatformId) ? (value as PlatformId) : null;
}

export async function GET(_req: Request, { params }: { params: { platform: string } }) {
  const platform = parsePlatform(params.platform);
  if (!platform) return NextResponse.json({ error: "未知平台" }, { status: 400 });
  const pending = readStore().oauthPending;
  return NextResponse.json({ choices: publicChoices(pending, platform) });
}

export async function POST(req: Request, { params }: { params: { platform: string } }) {
  const platform = parsePlatform(params.platform);
  if (!platform || (platform !== "facebook" && platform !== "instagram")) {
    return NextResponse.json({ error: "该平台不需要选择账号" }, { status: 400 });
  }
  const parsed = z.object({ id: z.string().min(1) }).safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "请选择要绑定的账号" }, { status: 400 });

  const pending = readStore().oauthPending;
  if (!pendingFresh(pending, platform)) {
    return NextResponse.json({ error: "授权已过期，请重新登录" }, { status: 400 });
  }
  const choice = pending?.choices?.find((item) => item.id === parsed.data.id);
  if (!choice) return NextResponse.json({ error: "请选择列表中的账号" }, { status: 400 });

  const result = bindChoice(platform, choice);
  if (pending?.hint) result.hint = pending.hint;
  const account = mutateStore((store) => applyOAuthResult(store, platform, result));
  if (!account) return NextResponse.json({ error: "账号不存在" }, { status: 404 });
  return NextResponse.json({ ok: true, platform });
}
