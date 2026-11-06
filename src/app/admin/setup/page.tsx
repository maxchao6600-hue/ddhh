import type { Metadata } from "next";
import { SetupForm } from "@/components/admin/setup-form";

export const metadata: Metadata = {
  title: "初始化管理员",
  robots: { index: false, follow: false },
};

export default function SetupPage() {
  return <SetupForm />;
}
