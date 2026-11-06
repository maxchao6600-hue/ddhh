"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { requestJson } from "@/lib/client-api";
import { AdminProvider, useAdmin } from "@/components/admin/admin-provider";
import type { SessionInfo } from "@/lib/types";

const links = [
  { href: "/admin", label: "概览" },
  { href: "/admin/prizes", label: "奖品与概率" },
  { href: "/admin/audit", label: "审计日志" },
  { href: "/admin/security", label: "安全设置" },
];

function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const admin = useAdmin();

  async function logout() {
    await requestJson("/api/admin/logout", { method: "POST", csrf: admin.csrfToken });
    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <div className="min-h-dvh bg-[#f3efe8] text-[#1c140c]">
      <div className="mx-auto grid min-h-dvh max-w-6xl md:grid-cols-[220px_1fr]">
        <aside className="border-b border-[#e4d8c8] bg-[#fffaf4] px-4 py-4 md:border-r md:border-b-0 md:px-5 md:py-8">
          <p className="text-xs tracking-[0.22em] text-[#9a6b32]">ADMIN</p>
          <p className="mt-1 font-[family-name:var(--font-display)] text-2xl">拼豆轮盘</p>
          <p className="mt-1 text-sm text-[#6f6256]">店主 {admin.username}</p>
          <nav className="mt-4 flex gap-2 overflow-x-auto md:mt-8 md:flex-col">
            {links.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-full px-3 py-2 text-sm whitespace-nowrap md:rounded-xl ${
                    active ? "bg-[#1c140c] text-[#fff8ef]" : "hover:bg-[#f3e7d6]"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
          <button
            type="button"
            onClick={() => void logout()}
            className="mt-4 text-sm text-[#8a6230] underline underline-offset-4 md:mt-8"
          >
            退出登录
          </button>
        </aside>
        <div className="px-4 py-6 sm:px-6 md:py-8">{children}</div>
      </div>
    </div>
  );
}

export function PanelShell({ session, children }: { session: SessionInfo; children: React.ReactNode }) {
  return (
    <AdminProvider value={session}>
      <Shell>{children}</Shell>
    </AdminProvider>
  );
}
