"use client";

import { useMemo, useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { PageHeader, PrimaryButton } from "@/components/AppShell";
import { formatCurrency, formatDateOnly } from "@/lib/format";
import {
  MOCK_EXPENSE_ITEMS,
  MOCK_EXPENSE_TRANSACTIONS,
  type ExpenseTransaction,
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
  expense_item_id: z.string().min(1, "Pilih bahan"),
  quantity: z.coerce.number().int().positive("Qty harus lebih dari 0"),
  unit_price: z.coerce.number().positive("Harga harus lebih dari 0"),
  transaction_date: z.string().min(1, "Tanggal wajib diisi"),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function ExpensesClient() {
  const [transactions, setTransactions] = useState<ExpenseTransaction[]>(
    MOCK_EXPENSE_TRANSACTIONS,
  );
  const [dateFilter, setDateFilter] = useState(today());
  const [open, setOpen] = useState(false);

  const itemById = useMemo(() => new Map(MOCK_EXPENSE_ITEMS.map((i) => [i.id, i])), []);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      expense_item_id: "",
      quantity: 1,
      unit_price: 0,
      transaction_date: today(),
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
    const item = itemById.get(itemId);
    if (item?.default_price) {
      form.setValue("unit_price", item.default_price);
    }
  }

  function onSubmit(values: FormValues) {
    const newTransaction: ExpenseTransaction = {
      id: crypto.randomUUID(),
      expense_item_id: values.expense_item_id,
      quantity: values.quantity,
      unit_price: values.unit_price,
      transaction_date: values.transaction_date,
      notes: values.notes || null,
    };
    setTransactions((prev) => [newTransaction, ...prev]);
    toast.success("Pengeluaran dicatat (preview — belum tersimpan ke database)");
    setOpen(false);
  }

  const filtered = transactions.filter((t) => t.transaction_date === dateFilter);
  const dailyTotal = filtered.reduce((sum, t) => sum + t.quantity * t.unit_price, 0);

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
                            {MOCK_EXPENSE_ITEMS.map((i) => (
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
                <TableHead>Bahan</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Harga Satuan</TableHead>
                <TableHead className="text-right">Subtotal</TableHead>
                <TableHead>Catatan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((t) => {
                const item = itemById.get(t.expense_item_id);
                return (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{item?.name ?? "-"}</TableCell>
                    <TableCell>{item?.category ?? "-"}</TableCell>
                    <TableCell className="text-right">
                      {t.quantity} {item?.unit}
                    </TableCell>
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
