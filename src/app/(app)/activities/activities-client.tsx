"use client";

import { useMemo, useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { AppShell, PrimaryButton } from "@/components/AppShell";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/client";
import type { Activity, Organizer } from "@/lib/supabase/types";
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

const NONE = "__none__";

const schema = z.object({
  name: z.string().min(1, "Nama wajib diisi"),
  category: z.string().optional(),
  description: z.string().optional(),
  default_duration_minutes: z.coerce.number().int().positive("Durasi harus > 0"),
  organizer_id: z.string().optional(),
  capacity_recommendation: z.coerce.number().int().positive().optional().or(z.literal(undefined)),
  status: z.enum(["active", "inactive"]),
});

type FormValues = z.infer<typeof schema>;

export function ActivitiesClient({
  initialActivities,
  organizers,
}: {
  initialActivities: Activity[];
  organizers: Organizer[];
}) {
  const { isAdmin } = useAuth();
  const [activities, setActivities] = useState(initialActivities);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Activity | null>(null);

  const filtered = useMemo(
    () => activities.filter((a) => a.name.toLowerCase().includes(search.toLowerCase())),
    [activities, search],
  );

  const organizerName = (id: string | null) =>
    organizers.find((o) => o.id === id)?.name ?? "-";

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      category: "",
      description: "",
      default_duration_minutes: 60,
      organizer_id: NONE,
      status: "active",
    },
  });

  function openCreate() {
    setEditing(null);
    form.reset({
      name: "",
      category: "",
      description: "",
      default_duration_minutes: 60,
      organizer_id: NONE,
      status: "active",
    });
    setOpen(true);
  }

  function openEdit(a: Activity) {
    setEditing(a);
    form.reset({
      name: a.name,
      category: a.category ?? "",
      description: a.description ?? "",
      default_duration_minutes: a.default_duration_minutes,
      organizer_id: a.organizer_id ?? NONE,
      capacity_recommendation: a.capacity_recommendation ?? undefined,
      status: a.status,
    });
    setOpen(true);
  }

  async function onSubmit(values: FormValues) {
    const supabase = createClient();
    const payload = {
      ...values,
      organizer_id: values.organizer_id === NONE ? null : values.organizer_id,
      capacity_recommendation: values.capacity_recommendation ?? null,
    };
    if (editing) {
      const { data, error } = await supabase
        .from("activities")
        .update(payload)
        .eq("id", editing.id)
        .select()
        .single();
      if (error) {
        toast.error("Gagal menyimpan: " + error.message);
        return;
      }
      setActivities((prev) => prev.map((a) => (a.id === editing.id ? (data as Activity) : a)));
      toast.success("Aktivitas diperbarui");
    } else {
      const { data, error } = await supabase.from("activities").insert(payload).select().single();
      if (error) {
        toast.error("Gagal menambah: " + error.message);
        return;
      }
      setActivities((prev) => [...prev, data as Activity]);
      toast.success("Aktivitas ditambahkan");
    }
    setOpen(false);
  }

  return (
    <AppShell
      title="Master Aktivitas"
      subtitle="Kelola jenis kegiatan Arayya"
      action={
        isAdmin ? (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <PrimaryButton onClick={openCreate}>+ Aktivitas Baru</PrimaryButton>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editing ? "Edit Aktivitas" : "Tambah Aktivitas"}</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nama Aktivitas</FormLabel>
                        <FormControl>
                          <Input placeholder="Melukis" {...field} />
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
                          <Input placeholder="Workshop" {...field} />
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
                    name="default_duration_minutes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Durasi Default (menit)</FormLabel>
                        <FormControl>
                          <Input type="number" min={1} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="organizer_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Organizer</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value={NONE}>Tidak ada</SelectItem>
                            {organizers.map((o) => (
                              <SelectItem key={o.id} value={o.id}>
                                {o.name}
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
                    name="capacity_recommendation"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rekomendasi Kapasitas</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={1}
                            {...field}
                            value={field.value ?? ""}
                          />
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
          placeholder="Cari aktivitas..."
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
                <TableHead>Durasi</TableHead>
                <TableHead>Organizer</TableHead>
                <TableHead>Status</TableHead>
                {isAdmin && <TableHead className="text-right">Aksi</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.name}</TableCell>
                  <TableCell>{a.category ?? "-"}</TableCell>
                  <TableCell>{a.default_duration_minutes} menit</TableCell>
                  <TableCell>{organizerName(a.organizer_id)}</TableCell>
                  <TableCell>
                    <Badge variant={a.status === "active" ? "default" : "secondary"}>
                      {a.status === "active" ? "Aktif" : "Nonaktif"}
                    </Badge>
                  </TableCell>
                  {isAdmin && (
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => openEdit(a)}>
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
    </AppShell>
  );
}
