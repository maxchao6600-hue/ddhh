import { Suspense } from "react";
import type { Metadata } from "next";
import { LoginForm } from "@/components/admin/login-form";

export const metadata: Metadata = {
  title: "店主登录",
  robots: { index: false, follow: false },
};

async function LoginContent({
  searchParams,
}: {
  searchParams: Promise<{ created?: string | string[] }>;
}) {
  const params = await searchParams;
  const created = params.created === "1" || (Array.isArray(params.created) && params.created.includes("1"));
  return <LoginForm created={created} />;
}

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string | string[] }>;
}) {
  return (
    <Suspense fallback={<main className="min-h-dvh bg-[#f3efe8]" />}>
      <LoginContent searchParams={searchParams} />
    </Suspense>
  );
}
