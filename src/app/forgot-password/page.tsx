"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
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

const schema = z.object({
  email: z.string().email("Email tidak valid"),
});

type FormValues = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: FormValues) {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      setError("Gagal mengirim email reset. Coba lagi beberapa saat.");
      return;
    }
    setSent(true);
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

        <h1 className="mb-1 font-display text-xl font-bold">Lupa Password</h1>
        <p className="mb-6 text-sm text-muted-ink">
          Masukkan email Anda, kami akan kirim link untuk mengatur ulang password.
        </p>

        {sent ? (
          <p className="rounded-xl bg-mint/40 p-4 text-sm text-emerald-800">
            Email reset password sudah dikirim (jika email tersebut terdaftar). Cek
            inbox Anda dan ikuti link di dalamnya.
          </p>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="nama@arayya.id" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Mengirim..." : "Kirim Link Reset"}
              </Button>
            </form>
          </Form>
        )}

        <Link
          href="/login"
          className="mt-4 block text-center text-sm text-muted-ink underline-offset-2 hover:underline"
        >
          Kembali ke halaman masuk
        </Link>
      </div>
    </div>
  );
}
