"use client";

import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { PageHeader, PrimaryButton } from "@/components/AppShell";
import { InputterBanner } from "@/components/InputterBanner";
import { useAuth } from "@/lib/auth-context";
import { useInputterSession } from "@/hooks/use-inputter-session";
import { formatCurrency, formatDateOnly } from "@/lib/format";
import { sumExpenseTotal } from "@/lib/expenses";
import { createClient } from "@/lib/supabase/client";
import type { ExpenseItem, ExpenseTransaction } from "@/lib/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  lastInputter,
}: {
  initialItems: ExpenseItem[];
  initialTransactions: ExpenseTransaction[];
  initialDate: string;
  lastInputter: { inputter_name: string; created_at: string } | null;
}) {
  const { isAdmin, isSuperAdmin } = useAuth();
  const [transactions, setTransactions] = useState(initialTransactions);
  const [dateFilter, setDateFilter] = useState(initialDate);
  const [showArchived, setShowArchived] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ExpenseTransaction | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ExpenseTransaction | null>(null);
  const { inputterName, hydrated, setInputterName } = useInputterSession();

  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    loadTransactions(dateFilter, showArchived);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFilter, showArchived]);

  async function loadTransactions(date: string, includeArchived: boolean) {
    const supabase = createClient();
    let query = supabase
      .from("expense_transactions")
      .select("*, expense_items(name, category, unit)")
      .eq("transaction_date", date);
    if (!includeArchived) {
      query = query.is("deleted_at", null);
    }
    const { data, error } = await query.order("created_at", { ascending: false });
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
    setEditing(null);
    form.reset({
      expense_item_id: "",
      quantity: 1,
      unit_price: 0,
      transaction_date: dateFilter,
      notes: "",
    });
    setOpen(true);
  }

  function openEdit(t: ExpenseTransaction) {
    setEditing(t);
    form.reset({
      expense_item_id: t.expense_item_id,
      quantity: t.quantity,
      unit_price: t.unit_price,
      transaction_date: t.transaction_date,
      notes: t.notes ?? "",
    });
    setOpen(true);
  }

  function onItemChange(itemId: string) {
    form.setValue("expense_item_id", itemId);
    // Prefill with the catalog's reference price, but it stays editable —
    // actual purchase price can differ (bahan naik-turun harga). Only
    // applied when creating — editing keeps whatever price was typed.
    if (editing) return;
    const item = initialItems.find((i) => i.id === itemId);
    if (item?.default_price) {
      form.setValue("unit_price", item.default_price);
    }
  }

  async function onSubmit(values: FormValues) {
    const supabase = createClient();

    if (editing) {
      const { error } = await supabase
        .from("expense_transactions")
        .update({
          expense_item_id: values.expense_item_id,
          quantity: values.quantity,
          unit_price: values.unit_price,
          transaction_date: values.transaction_date,
          notes: values.notes || null,
        })
        .eq("id", editing.id);
      if (error) {
        toast.error("Gagal menyimpan perubahan: " + error.message);
        return;
      }
      toast.success("Pengeluaran diperbarui");
    } else {
      if (!inputterName) return;
      const { error } = await supabase.from("expense_transactions").insert({
        expense_item_id: values.expense_item_id,
        quantity: values.quantity,
        unit_price: values.unit_price,
        transaction_date: values.transaction_date,
        notes: values.notes || null,
        inputter_name: inputterName,
      });
      if (error) {
        toast.error("Gagal mencatat pengeluaran: " + error.message);
        return;
      }
      toast.success("Pengeluaran dicatat");
    }

    setOpen(false);
    if (values.transaction_date === dateFilter) {
      await loadTransactions(dateFilter, showArchived);
    } else {
      setDateFilter(values.transaction_date);
    }
  }

  async function archiveTransaction(t: ExpenseTransaction) {
    const supabase = createClient();
    const { error } = await supabase
      .from("expense_transactions")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", t.id);
    if (error) {
      toast.error("Gagal mengarsipkan: " + error.message);
      return;
    }
    toast.success("Pengeluaran diarsipkan");
    await loadTransactions(dateFilter, showArchived);
  }

  async function restoreTransaction(t: ExpenseTransaction) {
    const supabase = createClient();
    const { error } = await supabase
      .from("expense_transactions")
      .update({ deleted_at: null })
      .eq("id", t.id);
    if (error) {
      toast.error("Gagal memulihkan: " + error.message);
      return;
    }
    toast.success("Pengeluaran dipulihkan");
    await loadTransactions(dateFilter, showArchived);
  }

  async function hardDeleteTransaction() {
    if (!deleteTarget) return;
    const supabase = createClient();
    const { error } = await supabase
      .from("expense_transactions")
      .delete()
      .eq("id", deleteTarget.id);
    if (error) {
      toast.error("Gagal menghapus permanen: " + error.message);
      return;
    }
    toast.success("Pengeluaran dihapus permanen");
    setDeleteTarget(null);
    await loadTransactions(dateFilter, showArchived);
  }

  const dailyTotal = sumExpenseTotal(transactions.filter((t) => !t.deleted_at));
  const inputterHistory = transactions.map((t) => ({
    name: t.inputter_name,
    created_at: t.created_at,
  }));

  return (
    <>
      <PageHeader
        title="Rekap Pengeluaran"
        subtitle="Catat restock bahan etalase, harian"
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <PrimaryButton onClick={openCreate} disabled={!inputterName}>
                + Catat Pengeluaran
              </PrimaryButton>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editing ? "Edit Pengeluaran" : "Catat Pengeluaran"}</DialogTitle>
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

      <InputterBanner
        label="Penginput Pengeluaran"
        inputterName={inputterName}
        hydrated={hydrated}
        onSetName={setInputterName}
        lastInputter={
          lastInputter
            ? { name: lastInputter.inputter_name, created_at: lastInputter.created_at }
            : null
        }
        history={inputterHistory}
      />

      <div className="glass rounded-[22px] p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-4">
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
            {isAdmin && (
              <label className="flex items-center gap-2 text-sm text-muted-ink">
                <input
                  type="checkbox"
                  checked={showArchived}
                  onChange={(e) => setShowArchived(e.target.checked)}
                />
                Tampilkan yang diarsipkan
              </label>
            )}
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
                <TableHead>Penginput</TableHead>
                <TableHead>Catatan</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((t) => {
                const archived = Boolean(t.deleted_at);
                return (
                  <TableRow key={t.id} className={archived ? "opacity-60" : undefined}>
                    <TableCell className="font-medium">
                      {t.expense_items?.name ?? "-"}
                      {archived && (
                        <Badge variant="secondary" className="ml-2">
                          Diarsipkan
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{t.expense_items?.category ?? "-"}</TableCell>
                    <TableCell className="text-right">
                      {t.quantity} {t.expense_items?.unit}
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(t.unit_price)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(t.total)}</TableCell>
                    <TableCell>{t.inputter_name}</TableCell>
                    <TableCell className="text-muted-ink">{t.notes ?? "-"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {!archived && (
                          <Button size="sm" variant="outline" onClick={() => openEdit(t)}>
                            Edit
                          </Button>
                        )}
                        {isAdmin && !archived && (
                          <Button size="sm" variant="outline" onClick={() => archiveTransaction(t)}>
                            Arsipkan
                          </Button>
                        )}
                        {isAdmin && archived && (
                          <Button size="sm" variant="outline" onClick={() => restoreTransaction(t)}>
                            Pulihkan
                          </Button>
                        )}
                        {isSuperAdmin && archived && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => setDeleteTarget(t)}
                          >
                            Hapus Permanen
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {transactions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-ink">
                    Belum ada pengeluaran tercatat untuk tanggal ini.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus permanen pengeluaran ini?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.expense_items?.name} —{" "}
              {deleteTarget && formatCurrency(deleteTarget.total)}. Tindakan ini tidak bisa
              dibatalkan, data akan hilang sepenuhnya (bukan diarsipkan).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={hardDeleteTransaction}>Hapus Permanen</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
