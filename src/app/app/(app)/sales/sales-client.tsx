"use client";

import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { PageHeader, PrimaryButton } from "@/components/AppShell";
import { InputterBanner } from "@/components/InputterBanner";
import { useInputterSession } from "@/hooks/use-inputter-session";
import { formatCurrency, formatDateOnly } from "@/lib/format";
import { sumSalesTotal } from "@/lib/sales";
import { createClient } from "@/lib/supabase/client";
import type { Product, SalesTransaction } from "@/lib/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const schema = z.object({
  product_id: z.string().min(1, "Pilih produk"),
  quantity: z.coerce.number().int().positive("Qty harus lebih dari 0"),
  transaction_date: z.string().min(1, "Tanggal wajib diisi"),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export function SalesClient({
  initialProducts,
  initialTransactions,
  initialDate,
}: {
  initialProducts: Product[];
  initialTransactions: SalesTransaction[];
  initialDate: string;
}) {
  const [transactions, setTransactions] = useState(initialTransactions);
  const [dateFilter, setDateFilter] = useState(initialDate);
  const [open, setOpen] = useState(false);
  const { inputterName, hydrated, setInputterName } = useInputterSession();

  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    loadTransactions(dateFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFilter]);

  async function loadTransactions(date: string) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("sales_transactions")
      .select("*, products(name, category)")
      .eq("transaction_date", date)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Gagal memuat data: " + error.message);
      return;
    }
    setTransactions((data as any) ?? []);
  }

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { product_id: "", quantity: 1, transaction_date: dateFilter, notes: "" },
  });

  function openCreate() {
    form.reset({ product_id: "", quantity: 1, transaction_date: dateFilter, notes: "" });
    setOpen(true);
  }

  async function onSubmit(values: FormValues) {
    const product = initialProducts.find((p) => p.id === values.product_id);
    if (!product || !inputterName) return;

    const supabase = createClient();
    const { error } = await supabase.from("sales_transactions").insert({
      product_id: values.product_id,
      quantity: values.quantity,
      // Snapshot the product's current price at the moment of entry —
      // deliberately not a live join, so historical recap stays correct
      // if the product's price is revised later.
      unit_price: product.price,
      transaction_date: values.transaction_date,
      notes: values.notes || null,
      inputter_name: inputterName,
    });
    if (error) {
      toast.error("Gagal mencatat penjualan: " + error.message);
      return;
    }
    toast.success("Penjualan dicatat");
    setOpen(false);
    if (values.transaction_date === dateFilter) {
      await loadTransactions(dateFilter);
    } else {
      setDateFilter(values.transaction_date);
    }
  }

  const dailyTotal = sumSalesTotal(transactions);

  return (
    <>
      <PageHeader
        title="Rekap Penjualan"
        subtitle="Catat penjualan paket per item, harian"
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <PrimaryButton onClick={openCreate} disabled={!inputterName}>
                + Catat Penjualan
              </PrimaryButton>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Catat Penjualan</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="product_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Produk</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Pilih produk" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {initialProducts.map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.name} — {formatCurrency(p.price)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="quantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Jumlah</FormLabel>
                        <FormControl>
                          <Input type="number" min={1} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="transaction_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tanggal</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
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
                  <Button type="submit" className="w-full">
                    Simpan
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        }
      />

      <InputterBanner inputterName={inputterName} hydrated={hydrated} onSetName={setInputterName} />

      <div className="glass rounded-[22px] p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <label htmlFor="date-filter" className="text-sm text-muted-ink">
              Tanggal:
            </label>
            <Input
              id="date-filter"
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-auto"
            />
          </div>
          <p className="text-sm font-medium">
            Total {formatDateOnly(dateFilter, "d MMM yyyy")}:{" "}
            <span className="font-display text-lg font-bold">{formatCurrency(dailyTotal)}</span>
          </p>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produk</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Harga Satuan</TableHead>
                <TableHead className="text-right">Subtotal</TableHead>
                <TableHead>Penginput</TableHead>
                <TableHead>Catatan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.products?.name ?? "-"}</TableCell>
                  <TableCell>{t.products?.category ?? "-"}</TableCell>
                  <TableCell className="text-right">{t.quantity}</TableCell>
                  <TableCell className="text-right">{formatCurrency(t.unit_price)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(t.total)}</TableCell>
                  <TableCell>{t.inputter_name}</TableCell>
                  <TableCell className="text-muted-ink">{t.notes ?? "-"}</TableCell>
                </TableRow>
              ))}
              {transactions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-ink">
                    Belum ada penjualan tercatat untuk tanggal ini.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </>
  );
}
