"use client";

import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { PageHeader, PrimaryButton } from "@/components/AppShell";
import { formatCurrency, formatDateOnly } from "@/lib/format";
import { sumExpenseTotal } from "@/lib/expenses";
import { createClient } from "@/lib/supabase/client";
import type { ExpenseItem, ExpenseTransaction } from "@/lib/supabase/types";
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
  expense_item_id: z.string().min(1, "Pilih bahan"),
  quantity: z.coerce.number().int().positive("Qty harus lebih dari 0"),
  unit_price: z.coerce.number().positive("Harga harus lebih dari 0"),
  transaction_date: z.string().min(1, "Tanggal wajib diisi"),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export function ExpensesClient({
  initialItems,
  initialTransactions,
  initialDate,
}: {
  initialItems: ExpenseItem[];
  initialTransactions: ExpenseTransaction[];
  initialDate: string;
}) {
  const [transactions, setTransactions] = useState(initialTransactions);
  const [dateFilter, setDateFilter] = useState(initialDate);
  const [open, setOpen] = useState(false);

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
      .from("expense_transactions")
      .select("*, expense_items(name, category, unit)")
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
    defaultValues: {
      expense_item_id: "",
      quantity: 1,
      unit_price: 0,
      transaction_date: dateFilter,
      notes: "",
    },
  });

  function openCreate() {
    form.reset({
      expense_item_id: "",
      quantity: 1,
      unit_price: 0,
      transaction_date: dateFilter,
      notes: "",
    });
    setOpen(true);
  }

  function onItemChange(itemId: string) {
    form.setValue("expense_item_id", itemId);
    // Prefill with the catalog's reference price, but it stays editable —
    // actual purchase price can differ (bahan naik-turun harga).
    const item = initialItems.find((i) => i.id === itemId);
    if (item?.default_price) {
      form.setValue("unit_price", item.default_price);
    }
  }

  async function onSubmit(values: FormValues) {
    const supabase = createClient();
    const { error } = await supabase.from("expense_transactions").insert({
      expense_item_id: values.expense_item_id,
      quantity: values.quantity,
      unit_price: values.unit_price,
      transaction_date: values.transaction_date,
      notes: values.notes || null,
    });
    if (error) {
      toast.error("Gagal mencatat pengeluaran: " + error.message);
      return;
    }
    toast.success("Pengeluaran dicatat");
    setOpen(false);
    if (values.transaction_date === dateFilter) {
      await loadTransactions(dateFilter);
    } else {
      setDateFilter(values.transaction_date);
    }
  }

  const dailyTotal = sumExpenseTotal(transactions);

  return (
    <>
      <PageHeader
        title="Rekap Pengeluaran"
        subtitle="Catat restock bahan etalase, harian"
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <PrimaryButton onClick={openCreate}>+ Catat Pengeluaran</PrimaryButton>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Catat Pengeluaran</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="expense_item_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bahan</FormLabel>
                        <Select onValueChange={onItemChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Pilih bahan" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {initialItems.map((i) => (
                              <SelectItem key={i.id} value={i.id}>
                                {i.name} ({i.unit})
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
                    name="unit_price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Harga Satuan (bisa disesuaikan)</FormLabel>
                        <FormControl>
                          <Input type="number" min={0} {...field} />
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
                <TableHead>Bahan</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Harga Satuan</TableHead>
                <TableHead className="text-right">Subtotal</TableHead>
                <TableHead>Catatan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.expense_items?.name ?? "-"}</TableCell>
                  <TableCell>{t.expense_items?.category ?? "-"}</TableCell>
                  <TableCell className="text-right">
                    {t.quantity} {t.expense_items?.unit}
                  </TableCell>
                  <TableCell className="text-right">{formatCurrency(t.unit_price)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(t.total)}</TableCell>
                  <TableCell className="text-muted-ink">{t.notes ?? "-"}</TableCell>
                </TableRow>
              ))}
              {transactions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-ink">
                    Belum ada pengeluaran tercatat untuk tanggal ini.
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
