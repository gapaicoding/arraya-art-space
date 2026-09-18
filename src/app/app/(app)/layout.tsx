import { getCurrentUserProfile } from "@/lib/auth";
import { AuthProvider } from "@/lib/auth-context";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile, email } = await getCurrentUserProfile();
  const role = profile?.role ?? "staff";

  return (
    <AuthProvider
      value={{
        fullName: profile?.full_name ?? email ?? null,
        role,
        isAdmin: role === "admin",
      }}
    >
      {children}
    </AuthProvider>
  );
}
