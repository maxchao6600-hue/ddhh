import { Suspense } from "react";
import { PanelShell } from "@/components/admin/panel-shell";
import { requirePageAdmin } from "@/lib/current-admin";

export const metadata = {
  robots: { index: false, follow: false },
};

async function Authed({ children }: { children: React.ReactNode }) {
  const session = await requirePageAdmin();
  return <PanelShell session={session}>{children}</PanelShell>;
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-[#f3efe8] p-8 text-[#1c140c]">正在确认登录状态…</div>}>
      <Authed>{children}</Authed>
    </Suspense>
  );
}
