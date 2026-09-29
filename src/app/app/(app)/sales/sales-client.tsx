"use client";

import { useMemo, useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { PageHeader, PrimaryButton } from "@/components/AppShell";
import { formatCurrency, formatDateOnly } from "@/lib/format";
import {
  MOCK_PRODUCTS,
  MOCK_SALES_TRANSACTIONS,
  type SalesTransaction,
} from "@/lib/retail-mock-data";
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

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function SalesClient() {
  const [transactions, setTransactions] = useState<SalesTransaction[]>(MOCK_SALES_TRANSACTIONS);
  const [dateFilter, setDateFilter] = useState(today());
  const [open, setOpen] = useState(false);

  const productById = useMemo(
    () => new Map(MOCK_PRODUCTS.map((p) => [p.id, p])),
    [],
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { product_id: "", quantity: 1, transaction_date: today(), notes: "" },
  });

  function openCreate() {
    form.reset({ product_id: "", quantity: 1, transaction_date: dateFilter, notes: "" });
    setOpen(true);
  }

  function onSubmit(values: FormValues) {
    const product = productById.get(values.product_id);
    if (!product) return;
    const newTransaction: SalesTransaction = {
      id: crypto.randomUUID(),
      product_id: values.product_id,
      quantity: values.quantity,
      // Snapshot the product's current price at the moment of entry — this
      // mirrors how the real sales_transactions.unit_price column will
      // behave (copied at insert time, not a live join to products.price).
      unit_price: product.price,
      transaction_date: values.transaction_date,
      notes: values.notes || null,
    };
    setTransactions((prev) => [newTransaction, ...prev]);
    toast.success("Penjualan dicatat (preview — belum tersimpan ke database)");
    setOpen(false);
  }

  const filtered = transactions.filter((t) => t.transaction_date === dateFilter);
  const dailyTotal = filtered.reduce((sum, t) => sum + t.quantity * t.unit_price, 0);

  return (
    <>
      <PageHeader
        title="Rekap Penjualan"
        subtitle="Catat penjualan paket per item, harian"
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <PrimaryButton onClick={openCreate}>+ Catat Penjualan</PrimaryButton>
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
                            {MOCK_PRODUCTS.map((p) => (
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

      <div className="glass rounded-[22px] border-2 border-dashed border-brand/40 bg-brand/5 p-4 text-sm text-muted-ink">
        Halaman ini masih pratinjau tampilan — data belum tersambung ke database. Lihat{" "}
        <code className="text-xs">docs/stage-9-retail-financial-operations-plan.md</code>.
      </div>

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
                <TableHead>Catatan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((t) => {
                const product = productById.get(t.product_id);
                return (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{product?.name ?? "-"}</TableCell>
                    <TableCell>{product?.category ?? "-"}</TableCell>
                    <TableCell className="text-right">{t.quantity}</TableCell>
                    <TableCell className="text-right">{formatCurrency(t.unit_price)}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(t.quantity * t.unit_price)}
                    </TableCell>
                    <TableCell className="text-muted-ink">{t.notes ?? "-"}</TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-ink">
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
