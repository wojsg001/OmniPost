import { NextResponse } from "next/server";
import { mutateStore } from "@/lib/db";
import { isDryRun } from "@/lib/platforms/base";
import { BIND_SPECS, callbackUrl } from "@/lib/platforms/bind";
import { isBound, publicCredentials } from "@/lib/platforms/credentials";

export const dynamic = "force-dynamic";

export async function GET() {
  const store = mutateStore((s) => s);
  return NextResponse.json({
    dryRun: isDryRun(),
    accounts: store.accounts.map((account) => ({
      ...account,
      credentials: publicCredentials(account.credentials, account.platform),
      bound: isBound(account),
      oauth: BIND_SPECS[account.platform].oauth,
      docs: BIND_SPECS[account.platform].docs,
      oauthHint: BIND_SPECS[account.platform].oauthHint,
      fields: BIND_SPECS[account.platform].fields,
      callback: BIND_SPECS[account.platform].oauth ? callbackUrl(account.platform) : null,
    })),
  });
}

export async function POST() {
  const accounts = mutateStore((store) => {
    for (const account of store.accounts) {
      const ok = isBound(account);
      account.status = ok ? "connected" : "disconnected";
      account.hint = ok
        ? isDryRun()
          ? "已绑定，当前为模拟发布"
          : "已绑定，将用该账号真实发帖"
        : "授权登录或手动粘贴凭证";
      if (ok && !account.bindMethod) account.bindMethod = "env";
      account.updatedAt = new Date().toISOString();
    }
    return store.accounts;
  });
  return NextResponse.json({
    dryRun: isDryRun(),
    accounts: accounts.map((account) => ({
      ...account,
      credentials: publicCredentials(account.credentials, account.platform),
      bound: isBound(account),
      oauth: BIND_SPECS[account.platform].oauth,
      docs: BIND_SPECS[account.platform].docs,
      oauthHint: BIND_SPECS[account.platform].oauthHint,
      fields: BIND_SPECS[account.platform].fields,
      callback: BIND_SPECS[account.platform].oauth ? callbackUrl(account.platform) : null,
    })),
  });
}
