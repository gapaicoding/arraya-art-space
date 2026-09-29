"use client";

import { createContext, useContext } from "react";
import type { ProfileRole } from "@/lib/supabase/types";
import { getRolePermissions, type AppPermissions } from "@/lib/permissions";

export interface AuthContextValue extends AppPermissions {
  fullName: string | null;
  role: ProfileRole | null;
}

const AuthContext = createContext<AuthContextValue>({
  fullName: null,
  role: null,
  ...getRolePermissions(null),
});

export function AuthProvider({
  value,
  children,
}: {
  value: AuthContextValue;
  children: React.ReactNode;
}) {
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
