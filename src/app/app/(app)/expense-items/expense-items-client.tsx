"use client";

import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { PageHeader, PrimaryButton } from "@/components/AppShell";
import { useAuth } from "@/lib/auth-context";
import { formatCurrency } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import type { ExpenseItem } from "@/lib/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Badge } from "@/components/ui/badge";

const schema = z.object({
  name: z.string().min(1, "Nama wajib diisi"),
  category: z.string().optional(),
  unit: z.string().min(1, "Satuan wajib diisi"),
  default_price: z.coerce.number().min(0).optional(),
  status: z.enum(["active", "inactive"]),
});

type FormValues = z.infer<typeof schema>;

export function ExpenseItemsClient({ initialItems }: { initialItems: ExpenseItem[] }) {
  const { isAdmin } = useAuth();
  const [items, setItems] = useState(initialItems);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ExpenseItem | null>(null);

  const filtered = items.filter((i) => i.name.toLowerCase().includes(search.toLowerCase()));

  async function reload() {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("expense_items")
      .select("*")
      .order("name", { ascending: true });
    if (error) {
      toast.error("Gagal memuat data: " + error.message);
      return;
    }
    setItems(data ?? []);
  }

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", category: "", unit: "pcs", default_price: undefined, status: "active" },
  });

  function openCreate() {
    setEditing(null);
    form.reset({ name: "", category: "", unit: "pcs", default_price: undefined, status: "active" });
    setOpen(true);
  }

  function openEdit(i: ExpenseItem) {
    setEditing(i);
    form.reset({
      name: i.name,
      category: i.category ?? "",
      unit: i.unit,
      default_price: i.default_price ?? undefined,
      status: i.status,
    });
    setOpen(true);
  }

  async function onSubmit(values: FormValues) {
    const supabase = createClient();
    const payload = {
      ...values,
      category: values.category || null,
      default_price: values.default_price || null,
    };
    if (editing) {
      const { error } = await supabase.from("expense_items").update(payload).eq("id", editing.id);
      if (error) {
        toast.error("Gagal menyimpan: " + error.message);
        return;
      }
      toast.success("Bahan diperbarui");
    } else {
      const { error } = await supabase.from("expense_items").insert(payload);
      if (error) {
        toast.error("Gagal menambah: " + error.message);
        return;
      }
      toast.success("Bahan ditambahkan");
    }
    setOpen(false);
    await reload();
  }

  return (
    <>
      <PageHeader
        title="Katalog Bahan"
        subtitle="Master bahan untuk restock etalase"
        action={
          isAdmin ? (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <PrimaryButton onClick={openCreate}>+ Bahan Baru</PrimaryButton>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editing ? "Edit Bahan" : "Tambah Bahan"}</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
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
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Kategori</FormLabel>
                          <FormControl>
                            <Input placeholder="mis. Bahan Habis Pakai" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="unit"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Satuan</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="default_price"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Harga Acuan (opsional)</FormLabel>
                          <FormControl>
                            <Input type="number" min={0} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="w-full">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="active">Aktif</SelectItem>
                              <SelectItem value="inactive">Nonaktif</SelectItem>
                            </SelectContent>
                          </Select>
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
          ) : undefined
        }
      />

      <div className="glass rounded-[22px] p-4">
        <Input
          placeholder="Cari bahan..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mb-4 max-w-sm"
        />
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead>Satuan</TableHead>
                <TableHead className="text-right">Harga Acuan</TableHead>
                <TableHead>Status</TableHead>
                {isAdmin && <TableHead className="text-right">Aksi</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((i) => (
                <TableRow key={i.id}>
                  <TableCell className="font-medium">{i.name}</TableCell>
                  <TableCell>{i.category ?? "-"}</TableCell>
                  <TableCell>{i.unit}</TableCell>
                  <TableCell className="text-right">
                    {i.default_price ? formatCurrency(i.default_price) : "-"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={i.status === "active" ? "default" : "secondary"}>
                      {i.status === "active" ? "Aktif" : "Nonaktif"}
                    </Badge>
                  </TableCell>
                  {isAdmin && (
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => openEdit(i)}>
                        Edit
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 6 : 5} className="text-center text-muted-ink">
                    Tidak ada data.
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
