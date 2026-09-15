"use client";

import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { AppShell, PrimaryButton } from "@/components/AppShell";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/client";
import type { Area } from "@/lib/supabase/types";
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
  code: z.string().min(1, "Kode wajib diisi"),
  description: z.string().optional(),
  capacity: z.coerce.number().int().positive("Kapasitas harus lebih dari 0"),
  location: z.string().optional(),
  status: z.enum(["active", "inactive"]),
});

type FormValues = z.infer<typeof schema>;

export const PAGE_SIZE = 20;

export function AreasClient({
  initialAreas,
  initialCount,
}: {
  initialAreas: Area[];
  initialCount: number;
}) {
  const { isAdmin } = useAuth();
  const [areas, setAreas] = useState(initialAreas);
  const [totalCount, setTotalCount] = useState(initialCount);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Area | null>(null);
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  // Search and pagination are both server-side (via .range()/.ilike()) so
  // large datasets never get loaded into the browser all at once. Debounce
  // the search input so we don't fire a query on every keystroke.
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const timer = setTimeout(() => loadAreas(1, search), search === "" ? 0 : 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  async function loadAreas(targetPage: number, searchValue: string) {
    const supabase = createClient();
    const from = (targetPage - 1) * PAGE_SIZE;
    let query = supabase.from("areas").select("*", { count: "exact" });
    if (searchValue) {
      query = query.or(`name.ilike.%${searchValue}%,code.ilike.%${searchValue}%`);
    }
    const { data, count, error } = await query
      .order("name", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) {
      toast.error("Gagal memuat data: " + error.message);
      return;
    }
    setAreas(data ?? []);
    setTotalCount(count ?? 0);
    setPage(targetPage);
  }

  function goToPage(targetPage: number) {
    if (targetPage < 1 || targetPage > totalPages) return;
    loadAreas(targetPage, search);
  }

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      code: "",
      description: "",
      capacity: 1,
      location: "",
      status: "active",
    },
  });

  function openCreate() {
    setEditing(null);
    form.reset({ name: "", code: "", description: "", capacity: 1, location: "", status: "active" });
    setOpen(true);
  }

  function openEdit(area: Area) {
    setEditing(area);
    form.reset({
      name: area.name,
      code: area.code,
      description: area.description ?? "",
      capacity: area.capacity,
      location: area.location ?? "",
      status: area.status,
    });
    setOpen(true);
  }

  async function onSubmit(values: FormValues) {
    const supabase = createClient();
    if (editing) {
      const { error } = await supabase.from("areas").update({ ...values }).eq("id", editing.id);
      if (error) {
        toast.error("Gagal menyimpan: " + error.message);
        return;
      }
      toast.success("Area diperbarui");
      await loadAreas(page, search);
    } else {
      const { error } = await supabase.from("areas").insert(values);
      if (error) {
        toast.error("Gagal menambah: " + error.message);
        return;
      }
      toast.success("Area ditambahkan");
      await loadAreas(1, search);
    }
    setOpen(false);
  }

  async function toggleStatus(area: Area) {
    const supabase = createClient();
    const next = area.status === "active" ? "inactive" : "active";
    const { error } = await supabase.from("areas").update({ status: next }).eq("id", area.id);
    if (error) {
      toast.error("Gagal mengubah status: " + error.message);
      return;
    }
    await loadAreas(page, search);
  }

  return (
    <AppShell
      title="Master Area"
      subtitle="Kelola ruang/area operasional Arayya"
      action={
        isAdmin ? (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <PrimaryButton onClick={openCreate}>+ Area Baru</PrimaryButton>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editing ? "Edit Area" : "Tambah Area"}</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nama Area</FormLabel>
                        <FormControl>
                          <Input placeholder="Studio A" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Kode</FormLabel>
                        <FormControl>
                          <Input placeholder="STA" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Deskripsi</FormLabel>
                        <FormControl>
                          <Textarea {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="capacity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Kapasitas</FormLabel>
                        <FormControl>
                          <Input type="number" min={1} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Lokasi</FormLabel>
                        <FormControl>
                          <Input placeholder="Lantai 1" {...field} />
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
          placeholder="Cari nama atau kode area..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mb-4 max-w-sm"
        />
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Kode</TableHead>
                <TableHead>Kapasitas</TableHead>
                <TableHead>Lokasi</TableHead>
                <TableHead>Status</TableHead>
                {isAdmin && <TableHead className="text-right">Aksi</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {areas.map((area) => (
                <TableRow key={area.id}>
                  <TableCell className="font-medium">{area.name}</TableCell>
                  <TableCell>{area.code}</TableCell>
                  <TableCell>{area.capacity}</TableCell>
                  <TableCell>{area.location ?? "-"}</TableCell>
                  <TableCell>
                    <Badge variant={area.status === "active" ? "default" : "secondary"}>
                      {area.status === "active" ? "Aktif" : "Nonaktif"}
                    </Badge>
                  </TableCell>
                  {isAdmin && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => openEdit(area)}>
                          Edit
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => toggleStatus(area)}>
                          {area.status === "active" ? "Nonaktifkan" : "Aktifkan"}
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
              {areas.length === 0 && (
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
              Halaman {page} dari {totalPages} ({totalCount} area)
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
