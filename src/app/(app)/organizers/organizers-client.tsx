"use client";

import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { AppShell, PrimaryButton } from "@/components/AppShell";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/client";
import type { Organizer } from "@/lib/supabase/types";
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
import { Badge } from "@/components/ui/badge";

const schema = z.object({
  name: z.string().min(1, "Nama wajib diisi"),
  type: z.enum(["internal", "external"]),
  pic_name: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Email tidak valid").optional().or(z.literal("")),
  notes: z.string().optional(),
  status: z.enum(["active", "inactive"]),
});

type FormValues = z.infer<typeof schema>;

export const PAGE_SIZE = 20;

export function OrganizersClient({
  initialOrganizers,
  initialCount,
}: {
  initialOrganizers: Organizer[];
  initialCount: number;
}) {
  const { isAdmin } = useAuth();
  const [organizers, setOrganizers] = useState(initialOrganizers);
  const [totalCount, setTotalCount] = useState(initialCount);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Organizer | null>(null);
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const timer = setTimeout(() => loadOrganizers(1, search), search === "" ? 0 : 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  async function loadOrganizers(targetPage: number, searchValue: string) {
    const supabase = createClient();
    const from = (targetPage - 1) * PAGE_SIZE;
    let query = supabase.from("organizers").select("*", { count: "exact" });
    if (searchValue) {
      query = query.ilike("name", `%${searchValue}%`);
    }
    const { data, count, error } = await query
      .order("name", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) {
      toast.error("Gagal memuat data: " + error.message);
      return;
    }
    setOrganizers(data ?? []);
    setTotalCount(count ?? 0);
    setPage(targetPage);
  }

  function goToPage(targetPage: number) {
    if (targetPage < 1 || targetPage > totalPages) return;
    loadOrganizers(targetPage, search);
  }

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      type: "internal",
      pic_name: "",
      phone: "",
      email: "",
      notes: "",
      status: "active",
    },
  });

  function openCreate() {
    setEditing(null);
    form.reset({ name: "", type: "internal", pic_name: "", phone: "", email: "", notes: "", status: "active" });
    setOpen(true);
  }

  function openEdit(o: Organizer) {
    setEditing(o);
    form.reset({
      name: o.name,
      type: o.type,
      pic_name: o.pic_name ?? "",
      phone: o.phone ?? "",
      email: o.email ?? "",
      notes: o.notes ?? "",
      status: o.status,
    });
    setOpen(true);
  }

  async function onSubmit(values: FormValues) {
    const supabase = createClient();
    const payload = { ...values, email: values.email || null };
    if (editing) {
      const { error } = await supabase.from("organizers").update(payload).eq("id", editing.id);
      if (error) {
        toast.error("Gagal menyimpan: " + error.message);
        return;
      }
      toast.success("Organizer diperbarui");
      await loadOrganizers(page, search);
    } else {
      const { error } = await supabase.from("organizers").insert(payload);
      if (error) {
        toast.error("Gagal menambah: " + error.message);
        return;
      }
      toast.success("Organizer ditambahkan");
      await loadOrganizers(1, search);
    }
    setOpen(false);
  }

  return (
    <AppShell
      title="Organizer"
      subtitle="Kelola penyelenggara internal & eksternal"
      action={
        isAdmin ? (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <PrimaryButton onClick={openCreate}>+ Organizer Baru</PrimaryButton>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editing ? "Edit Organizer" : "Tambah Organizer"}</DialogTitle>
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
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipe</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="internal">Internal</SelectItem>
                            <SelectItem value="external">Eksternal</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="pic_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>PIC</FormLabel>
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
                        <FormLabel>Telepon</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" {...field} />
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
                        <FormLabel>Catatan</FormLabel>
                        <FormControl>
                          <Textarea {...field} />
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
    >
      <div className="glass rounded-[22px] p-4">
        <Input
          placeholder="Cari organizer..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mb-4 max-w-sm"
        />
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Tipe</TableHead>
                <TableHead>PIC</TableHead>
                <TableHead>Kontak</TableHead>
                <TableHead>Status</TableHead>
                {isAdmin && <TableHead className="text-right">Aksi</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {organizers.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="font-medium">{o.name}</TableCell>
                  <TableCell className="capitalize">{o.type === "internal" ? "Internal" : "Eksternal"}</TableCell>
                  <TableCell>{o.pic_name ?? "-"}</TableCell>
                  <TableCell>{o.phone ?? o.email ?? "-"}</TableCell>
                  <TableCell>
                    <Badge variant={o.status === "active" ? "default" : "secondary"}>
                      {o.status === "active" ? "Aktif" : "Nonaktif"}
                    </Badge>
                  </TableCell>
                  {isAdmin && (
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => openEdit(o)}>
                        Edit
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
              {organizers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 6 : 5} className="text-center text-muted-ink">
                    Tidak ada data.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        {totalCount > 0 && (
          <div className="mt-4 flex items-center justify-between gap-3 text-sm text-muted-ink">
            <p>
              Halaman {page} dari {totalPages} ({totalCount} organizer)
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={page <= 1}
                onClick={() => goToPage(page - 1)}
              >
                Sebelumnya
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={page >= totalPages}
                onClick={() => goToPage(page + 1)}
              >
                Berikutnya
              </Button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
