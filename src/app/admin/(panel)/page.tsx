import type { Metadata } from "next";
import { Dashboard } from "@/components/admin/dashboard";

export const metadata: Metadata = { title: "概览" };

export default function AdminHomePage() {
  return <Dashboard />;
}
