"use client";

import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerForEventAction } from "./actions";
import { isValidIndonesianPhone } from "@/lib/phone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const schema = z.object({
  customer_name: z.string().min(1, "Nama wajib diisi").max(200, "Nama maksimal 200 karakter"),
  phone: z.string().refine(isValidIndonesianPhone, "Nomor HP tidak valid (format 08xxx / +62xxx)"),
  participant_count: z.coerce.number().int().positive("Jumlah peserta harus lebih dari 0"),
  notes: z.string().max(500, "Catatan maksimal 500 karakter").optional(),
  website: z.string().optional(), // honeypot — left empty by real visitors
});

type FormValues = z.infer<typeof schema>;

export function RegistrationForm({ scheduleId }: { scheduleId: string }) {
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { customer_name: "", phone: "", participant_count: 1, notes: "", website: "" },
  });

  async function onSubmit(values: FormValues) {
    setServerError(null);
    const formData = new FormData();
    formData.set("customer_name", values.customer_name);
    formData.set("phone", values.phone);
    formData.set("participant_count", String(values.participant_count));
    formData.set("notes", values.notes ?? "");
    formData.set("website", values.website ?? "");

    const result = await registerForEventAction(scheduleId, formData);
    if (result.error) {
      setServerError(result.error);
      return;
    }
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="glass rounded-[22px] p-8 text-center">
        <p className="font-display text-lg font-bold">Pendaftaran Terkirim</p>
        <p className="mt-2 text-sm text-muted-ink">
          Terima kasih! Tim kami akan menghubungi kamu lewat WhatsApp untuk konfirmasi lebih
          lanjut.
        </p>
      </div>
    );
  }

  return (
    <div className="glass rounded-[22px] p-5">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="customer_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nama</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>No. HP / WhatsApp</FormLabel>
                <FormControl>
                  <Input placeholder="08xxxxxxxxxx" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="participant_count"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Jumlah Peserta</FormLabel>
                <FormControl>
                  <Input type="number" min={1} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Catatan (opsional)</FormLabel>
                <FormControl>
                  <Textarea {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {/* Honeypot — hidden from real visitors via CSS, not `type="hidden"`,
              since some bots skip inputs with type=hidden specifically. */}
          <div className="absolute -left-[9999px]" aria-hidden="true">
            <label htmlFor="website">Website</label>
            <input
              id="website"
              tabIndex={-1}
              autoComplete="off"
              {...form.register("website")}
            />
          </div>

          {serverError && <p className="text-sm text-destructive">{serverError}</p>}

          <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Mengirim..." : "Kirim Pendaftaran"}
          </Button>
        </form>
      </Form>
    </div>
  );
}
