"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const schema = z
  .object({
    password: z.string().min(6, "Password minimal 6 karakter"),
    confirmPassword: z.string().min(6, "Password minimal 6 karakter"),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: "Konfirmasi password tidak sama",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof schema>;

export default function ResetPasswordPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  useEffect(() => {
    // Supabase's password-recovery link lands here with the recovery
    // session already established client-side (via the URL hash), so just
    // confirm a session exists before allowing the password update.
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      setSessionReady(!!data.session);
      setCheckingSession(false);
    });
  }, []);

  async function onSubmit(values: FormValues) {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: values.password });
    setLoading(false);
    if (error) {
      setError("Gagal mengatur password baru. Coba lagi.");
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden px-4">
      <div className="pointer-events-none fixed inset-0 -z-30 bg-[linear-gradient(160deg,oklch(0.97_0.02_240)_0%,oklch(0.95_0.02_265)_45%,oklch(0.95_0.03_300)_100%)]" />
      <div className="blob-a pointer-events-none fixed -z-20 left-[-8%] top-[-12%] size-[42rem] rounded-full bg-brand/40 blur-[120px]" />
      <div className="blob-b pointer-events-none fixed -z-20 right-[-10%] top-[18%] size-[36rem] rounded-full bg-accentv/35 blur-[130px]" />

      <div className="glass-strong relative z-10 w-full max-w-sm rounded-[26px] p-6">
        <div className="mb-6 flex items-center gap-3">
          <Image
            src="/logo-arayya.jpg"
            alt="Arayya Art & Space"
            width={40}
            height={40}
            className="size-10 shrink-0 rounded-xl object-cover shadow-lg shadow-brand/30"
            priority
          />
          <div>
            <p className="font-display text-base font-bold leading-none">Arayya</p>
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-faint-ink">
              Art &amp; Space
            </p>
          </div>
        </div>

        <h1 className="mb-1 font-display text-xl font-bold">Atur Password Baru</h1>

        {checkingSession ? (
          <p className="text-sm text-muted-ink">Memeriksa link reset...</p>
        ) : !sessionReady ? (
          <p className="text-sm text-destructive">
            Link reset password tidak valid atau sudah kedaluwarsa. Silakan minta
            link baru lewat halaman "Lupa password?".
          </p>
        ) : (
          <>
            <p className="mb-6 text-sm text-muted-ink">
              Masukkan password baru untuk akun Anda.
            </p>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password Baru</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Konfirmasi Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Menyimpan..." : "Simpan Password Baru"}
                </Button>
              </form>
            </Form>
          </>
        )}
      </div>
    </div>
  );
}
