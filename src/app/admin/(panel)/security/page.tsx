import type { Metadata } from "next";
import { SecurityPanel } from "@/components/admin/security-panel";

export const metadata: Metadata = { title: "安全设置" };

export default function SecurityPage() {
  return <SecurityPanel />;
}
