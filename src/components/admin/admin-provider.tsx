"use client";

import { createContext, useContext } from "react";
import type { SessionInfo } from "@/lib/types";

const AdminContext = createContext<SessionInfo | null>(null);

export function AdminProvider({ value, children }: { value: SessionInfo; children: React.ReactNode }) {
  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

export function useAdmin(): SessionInfo {
  const value = useContext(AdminContext);
  if (!value) throw new Error("缺少管理员会话");
  return value;
}
