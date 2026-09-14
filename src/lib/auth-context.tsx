"use client";

import { createContext, useContext } from "react";
import type { ProfileRole } from "@/lib/supabase/types";

export interface AuthContextValue {
  fullName: string | null;
  role: ProfileRole | null;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  fullName: null,
  role: null,
  isAdmin: false,
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
