import type { Metadata } from "next";
import { AuditLog } from "@/components/admin/audit-log";

export const metadata: Metadata = { title: "审计日志" };

export default function AuditPage() {
  return <AuditLog />;
}
