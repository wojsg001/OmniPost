"use client";

import { useEffect, useMemo, useState } from "react";
import { PLATFORM_SPECS } from "@/lib/platforms/specs";
import type { Account, BindMethod } from "@/lib/types";
import { PlatformName } from "@/components/platform-name";

interface BindField {
  key: string;
  label: string;
  secret?: boolean;
  placeholder?: string;
  hint?: string;
}

type AccountCard = Account & {
  bound: boolean;
  oauth: boolean;
  docs: string;
  oauthHint: string;
  fields: BindField[];
};

export default function PlatformsPage() {
  const [accounts, setAccounts] = useState<AccountCard[]>([]);
  const [dryRun, setDryRun] = useState(true);
  const [message, setMessage] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Record<string, string>>>({});
  const [busy, setBusy] = useState("");

  async function load() {
    const data = await fetch("/api/accounts").then((r) => r.json());
    setAccounts(data.accounts ?? []);
    setDryRun(data.dryRun);
    const next: Record<string, Record<string, string>> = {};
    for (const account of data.accounts ?? []) {
      next[account.platform] = {
        displayName: account.displayName,
        ...(account.credentials || {}),
      };
    }
    setDrafts(next);
  }

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (q.get("bound")) {
      setOpen(q.get("bound"));
      setMessage(`已绑定 ${q.get("bound")}`);
    }
    if (q.get("error")) setMessage(q.get("error") || "");
    void load();
  }, []);

  const connected = useMemo(() => accounts.filter((a) => a.bound).length, [accounts]);

  async function save(platform: string) {
    setBusy(platform);
    const draft = drafts[platform] || {};
    const { displayName, ...credentials } = draft;
    const data = await fetch(`/api/accounts/${platform}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName, credentials }),
    }).then((r) => r.json());
    setBusy("");
    if (data.error) {
      setMessage("保存失败");
      return;
    }
    setMessage("凭证已写入，可点授权或直接发帖");
    await load();
  }

  async function unbind(platform: string) {
    setBusy(platform);
    await fetch(`/api/accounts/${platform}`, { method: "DELETE" });
    setBusy("");
    setMessage("已解绑");
    await load();
  }

  function methodLabel(method: BindMethod | null, bound: boolean) {
    if (!bound) return "未绑定";
    if (method === "oauth") return "授权登录";
    if (method === "manual") return "手动凭证";
    if (method === "env") return "环境变量";
    return "已绑定";
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-paper-500">Accounts</p>
          <h1 className="mt-1 font-display text-4xl">绑定发帖账号</h1>
          <p className="mt-2 max-w-2xl text-sm text-paper-400">
            微博 / X / Facebook / Instagram 支持网页授权；公众号和小红书粘贴开放平台凭证。Docker 部署时请把回调地址设为
            <code className="mx-1 text-gold">OMNIPOST_BASE_URL</code>。
          </p>
        </div>
        <p className="chip">已绑定 {connected}/6 · {dryRun ? "模拟发布" : "真实发帖"}</p>
      </div>
      {message && <p className="text-sm text-moss">{message}</p>}
      <div className="grid gap-3 lg:grid-cols-2">
        {accounts.map((account) => {
          const spec = PLATFORM_SPECS[account.platform];
          const draft = drafts[account.platform] || {};
          const expanded = open === account.platform;
          return (
            <article key={account.id} className="card p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg">
                    <PlatformName id={account.platform} />
                  </h2>
                  <p className="mt-1 text-xs text-paper-500">
                    {spec.region === "cn" ? "中国互联网" : "海外平台"} · {methodLabel(account.bindMethod, account.bound)}
                  </p>
                </div>
                <span className={`chip ${account.bound ? "border-moss text-moss" : ""}`}>
                  {account.bound ? "已绑定" : "未绑定"}
                </span>
              </div>
              <p className="mt-3 text-sm text-paper-400">{account.hint}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button className="chip" onClick={() => setOpen(expanded ? null : account.platform)}>
                  {expanded ? "收起" : "绑定 / 改凭证"}
                </button>
                {account.oauth && (
                  <a className="chip border-flame-500/50 text-flame-400" href={`/api/oauth/${account.platform}`}>
                    授权登录
                  </a>
                )}
                <a className="chip" href={account.docs} target="_blank" rel="noreferrer">
                  开放平台
                </a>
                {account.bound && (
                  <button className="chip" disabled={busy === account.platform} onClick={() => void unbind(account.platform)}>
                    解绑
                  </button>
                )}
              </div>
              {expanded && (
                <div className="mt-4 space-y-3 border-t border-ink-700 pt-4">
                  <p className="text-xs text-paper-500">{account.oauthHint}</p>
                  {account.fields.map((field) => (
                    <label key={field.key} className="block text-xs text-paper-500">
                      {field.label}
                      <input
                        type={field.secret ? "password" : "text"}
                        value={draft[field.key] || ""}
                        placeholder={field.placeholder}
                        onChange={(e) =>
                          setDrafts((prev) => ({
                            ...prev,
                            [account.platform]: { ...draft, [field.key]: e.target.value },
                          }))
                        }
                        className="mt-1 w-full rounded-xl border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-paper-50"
                      />
                      {field.hint && <span className="mt-1 block text-[11px] text-paper-500">{field.hint}</span>}
                    </label>
                  ))}
                  <button
                    disabled={busy === account.platform}
                    onClick={() => void save(account.platform)}
                    className="rounded-full bg-flame-500 px-4 py-2 text-sm text-white disabled:opacity-50"
                  >
                    {busy === account.platform ? "保存中…" : "保存绑定"}
                  </button>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
