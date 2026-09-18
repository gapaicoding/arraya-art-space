"use client";

import { useMemo, useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { AppShell, PrimaryButton } from "@/components/AppShell";
import type { Profile } from "@/lib/supabase/types";
import { formatDateOnly } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
  AlertDialogTrigger,
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
import {
  createUserAction,
  updateUserRoleAction,
  toggleUserActiveAction,
  resetUserPasswordAction,
} from "./actions";

const createSchema = z.object({
  full_name: z.string().min(1, "Nama wajib diisi"),
  email: z.string().email("Email tidak valid"),
  password: z.string().min(6, "Password minimal 6 karakter"),
  role: z.enum(["admin", "staff"]),
});
type CreateFormValues = z.infer<typeof createSchema>;

function ResetPasswordDialog({
  userName,
  onConfirm,
}: {
  userName: string;
  onConfirm: (password: string) => Promise<void>;
}) {
  const [password, setPassword] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const tooShort = password.length > 0 && password.length < 6;

  return (
    <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <AlertDialogTrigger asChild>
        <Button size="sm" variant="outline">
          Reset Password
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Reset password {userName}?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Password Baru</label>
              <Input
                type="text"
                placeholder="Minimal 6 karakter"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {tooShort && (
                <p className="text-sm text-destructive">Password minimal 6 karakter</p>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setPassword("")}>Batal</AlertDialogCancel>
          <AlertDialogAction
            disabled={password.length < 6}
            onClick={async (e) => {
              e.preventDefault();
              await onConfirm(password);
              setPassword("");
              setDialogOpen(false);
            }}
          >
            Simpan
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function UsersClient({
  initialUsers,
  currentUserId,
}: {
  initialUsers: Profile[];
  currentUserId: string;
}) {
  const [users, setUsers] = useState(initialUsers);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  const filtered = useMemo(
    () =>
      users.filter(
        (u) =>
          (u.full_name ?? "").toLowerCase().includes(search.toLowerCase()) ||
          (u.email ?? "").toLowerCase().includes(search.toLowerCase()),
      ),
    [users, search],
  );

  const form = useForm<CreateFormValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { full_name: "", email: "", password: "", role: "staff" },
  });

  function openCreate() {
    form.reset({ full_name: "", email: "", password: "", role: "staff" });
    setOpen(true);
  }

  async function onCreateSubmit(values: CreateFormValues) {
    const result = await createUserAction(values.full_name, values.email, values.password, values.role);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(`User dibuat. Sampaikan password ini ke ${values.full_name}: ${values.password}`, {
      duration: 15000,
    });
    setOpen(false);
    setUsers((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        full_name: values.full_name,
        email: values.email,
        role: values.role,
        is_active: true,
        created_at: new Date().toISOString(),
      },
    ]);
  }

  async function onRoleChange(u: Profile, role: "admin" | "staff") {
    const result = await updateUserRoleAction(u.id, role);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, role } : x)));
    toast.success("Role diperbarui");
  }

  async function onToggleActive(u: Profile, isActive: boolean) {
    const result = await toggleUserActiveAction(u.id, isActive);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, is_active: isActive } : x)));
    toast.success(isActive ? "User diaktifkan kembali" : "User dinonaktifkan");
  }

  async function onResetPassword(u: Profile, password: string) {
    const result = await resetUserPasswordAction(u.id, password);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(`Password baru untuk ${u.full_name}: ${password}`, { duration: 15000 });
  }

  return (
    <AppShell
      title="Manajemen Pengguna"
      subtitle="Kelola akun, peran, dan status pengguna Arayya"
      action={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <PrimaryButton onClick={openCreate}>+ User Baru</PrimaryButton>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Tambah User</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onCreateSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="full_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nama</FormLabel>
                      <FormControl>
                        <Input placeholder="Nama lengkap" {...field} />
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
                        <Input type="email" placeholder="nama@arayya.id" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password Sementara</FormLabel>
                      <FormControl>
                        <Input type="text" placeholder="Minimal 6 karakter" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="staff">Staff</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
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
      }
    >
      <div className="glass rounded-[22px] p-4">
        <Input
          placeholder="Cari nama atau email pengguna..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mb-4 max-w-sm"
        />
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Peran</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Dibuat</TableHead>
                <TableHead className="text-right">Aktif</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((u) => {
                const isSelf = u.id === currentUserId;
                return (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">
                      {u.full_name ?? "-"}
                      {isSelf && <p className="text-xs text-muted-ink">(Anda)</p>}
                    </TableCell>
                    <TableCell>{u.email ?? "-"}</TableCell>
                    <TableCell>
                      <Select
                        value={u.role}
                        disabled={isSelf}
                        onValueChange={(value) => onRoleChange(u, value as "admin" | "staff")}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="staff">Staff</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Badge variant={u.is_active ? "default" : "secondary"}>
                        {u.is_active ? "Aktif" : "Nonaktif"}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDateOnly(u.created_at.slice(0, 10), "d MMM yyyy")}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-3">
                        <ResetPasswordDialog
                          userName={u.full_name ?? u.email ?? "user ini"}
                          onConfirm={(password) => onResetPassword(u, password)}
                        />
                        <Switch
                          checked={u.is_active}
                          disabled={isSelf}
                          onCheckedChange={(checked) => onToggleActive(u, checked)}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-ink">
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
