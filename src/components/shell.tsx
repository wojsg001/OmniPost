"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  Clapperboard,
  LayoutDashboard,
  PenLine,
  Radio,
  Settings2,
  Sparkles,
  Users,
} from "lucide-react";

const NAV = [
  { href: "/", label: "总览", icon: LayoutDashboard },
  { href: "/compose", label: "写一篇", icon: PenLine },
  { href: "/studio", label: "创作台", icon: Sparkles },
  { href: "/leads", label: "获客", icon: Users },
  { href: "/calendar", label: "日历", icon: CalendarDays },
  { href: "/queue", label: "队列", icon: Radio },
  { href: "/platforms", label: "账号", icon: Clapperboard },
  { href: "/settings", label: "设置", icon: Settings2 },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname.startsWith("/go/")) {
    return <main className="min-h-screen p-4 md:p-10">{children}</main>;
  }
  return (
    <div className="relative mx-auto flex min-h-screen max-w-[1440px]">
      <aside className="sticky top-0 hidden h-screen w-[220px] shrink-0 flex-col border-r border-ink-700/80 p-5 md:flex">
        <Link href="/" className="mb-8 block">
          <div className="font-display text-3xl tracking-wide text-paper-50">OmniPost</div>
          <p className="mt-1 text-xs text-paper-500">绑定账号 · 高峰发帖 · 获客</p>
        </Link>
        <nav className="flex flex-1 flex-col gap-1">
          {NAV.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm transition ${
                  active
                    ? "bg-flame-500/15 text-paper-50"
                    : "text-paper-400 hover:bg-ink-800 hover:text-paper-50"
                }`}
              >
                <Icon size={16} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="rounded-xl border border-ink-700 bg-ink-800/60 p-3 text-xs text-paper-500">
          时区固定 <span className="text-paper-100">Asia/Shanghai</span>
          <br />
          Docker / 本机都可跑
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="flex items-center justify-between border-b border-ink-700/80 px-4 py-3 md:hidden">
          <span className="font-display text-2xl">OmniPost</span>
          <div className="flex gap-2 overflow-x-auto text-xs">
            {NAV.map((item) => (
              <Link key={item.href} href={item.href} className="chip whitespace-nowrap">
                {item.label}
              </Link>
            ))}
          </div>
        </header>
        <main className="p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
