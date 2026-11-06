import type { Metadata } from "next";
import { LoginForm } from "@/components/admin/login-form";

export const metadata: Metadata = {
  title: "店主登录",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return <LoginForm />;
}
