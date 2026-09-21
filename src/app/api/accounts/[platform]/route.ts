import { NextResponse } from "next/server";
import { z } from "zod";
import { mutateStore } from "@/lib/db";
import { isDryRun } from "@/lib/platforms/base";
import { BIND_SPECS } from "@/lib/platforms/bind";
import { isBound, mergeCredentials, publicCredentials } from "@/lib/platforms/credentials";
import { PLATFORM_IDS, type PlatformId } from "@/lib/types";

export const dynamic = "force-dynamic";

function parsePlatform(value: string): PlatformId | null {
  return PLATFORM_IDS.includes(value as PlatformId) ? (value as PlatformId) : null;
}

export async function PATCH(req: Request, { params }: { params: { platform: string } }) {
  const platform = parsePlatform(params.platform);
  if (!platform) return NextResponse.json({ error: "未知平台" }, { status: 400 });
  const parsed = z
    .object({
      displayName: z.string().optional(),
      credentials: z.record(z.string()).optional(),
    })
    .safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const account = mutateStore((store) => {
    const current = store.accounts.find((a) => a.platform === platform);
    if (!current) return null;
    if (parsed.data.displayName?.trim()) current.displayName = parsed.data.displayName.trim();
    if (parsed.data.credentials) {
      current.credentials = mergeCredentials(current.credentials, parsed.data.credentials);
    }
    const ok = isBound(current);
    current.status = ok ? "connected" : "disconnected";
    current.bindMethod = ok ? current.bindMethod || "manual" : current.bindMethod;
    current.boundAt = ok ? current.boundAt || new Date().toISOString() : current.boundAt;
    current.hint = ok
      ? isDryRun()
        ? "已绑定，当前为模拟发布"
        : "已绑定，将用该账号真实发帖"
      : "凭证不完整，请继续填写或授权";
    current.updatedAt = new Date().toISOString();
    return current;
  });
  if (!account) return NextResponse.json({ error: "账号不存在" }, { status: 404 });
  return NextResponse.json({
    account: {
      ...account,
      credentials: publicCredentials(account.credentials, platform),
      bound: isBound(account),
      fields: BIND_SPECS[platform].fields,
    },
  });
}

export async function DELETE(_req: Request, { params }: { params: { platform: string } }) {
  const platform = parsePlatform(params.platform);
  if (!platform) return NextResponse.json({ error: "未知平台" }, { status: 400 });
  const account = mutateStore((store) => {
    const current = store.accounts.find((a) => a.platform === platform);
    if (!current) return null;
    current.credentials = {};
    current.status = "disconnected";
    current.bindMethod = null;
    current.boundAt = null;
    current.profileUrl = null;
    current.hint = "已解绑，可重新授权";
    current.updatedAt = new Date().toISOString();
    current.displayName =
      current.displayName.startsWith("@") || current.profileUrl ? `未连接` : current.displayName;
    return current;
  });
  return NextResponse.json({ account });
}
