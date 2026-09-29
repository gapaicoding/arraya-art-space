"use client";

import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/AppShell";
import { formatDateOnly, formatDateTime, formatTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import type { EventRegistration } from "@/lib/supabase/types";
import { Button } from "@/components/ui/button";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type StatusFilter = "all" | "pending" | "confirmed" | "rejected";

const STATUS_LABEL: Record<EventRegistration["status"], string> = {
  pending: "Menunggu",
  confirmed: "Diterima",
  rejected: "Ditolak",
};

const STATUS_VARIANT: Record<EventRegistration["status"], "secondary" | "default" | "destructive"> = {
  pending: "secondary",
  confirmed: "default",
  rejected: "destructive",
};

export function RegistrationsClient({
  initialRegistrations,
}: {
  initialRegistrations: EventRegistration[];
}) {
  const [registrations, setRegistrations] = useState(initialRegistrations);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");

  async function updateStatus(id: string, status: "confirmed" | "rejected") {
    const supabase = createClient();
    const { error } = await supabase
      .from("event_registrations")
      .update({ status, reviewed_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      toast.error("Gagal memperbarui status: " + error.message);
      return;
    }
    toast.success(status === "confirmed" ? "Pendaftaran diterima" : "Pendaftaran ditolak");
    setRegistrations((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status, reviewed_at: new Date().toISOString() } : r)),
    );
  }

  const filtered =
    statusFilter === "all" ? registrations : registrations.filter((r) => r.status === statusFilter);

  return (
    <>
      <PageHeader
        title="Pendaftaran"
        subtitle="Review pendaftaran event dari halaman publik"
      />

      <div className="glass rounded-[22px] p-4">
        <div className="mb-4 flex items-center gap-2">
          <label htmlFor="status-filter" className="text-sm text-muted-ink">
            Status:
          </label>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
            <SelectTrigger id="status-filter" className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Menunggu</SelectItem>
              <SelectItem value="confirmed">Diterima</SelectItem>
              <SelectItem value="rejected">Ditolak</SelectItem>
              <SelectItem value="all">Semua</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pendaftar</TableHead>
                <TableHead>No. HP</TableHead>
                <TableHead className="text-right">Peserta</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>Catatan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Masuk</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.customer_name}</TableCell>
                  <TableCell>{r.phone}</TableCell>
                  <TableCell className="text-right">{r.participant_count}</TableCell>
                  <TableCell>
                    {r.schedules ? (
                      <>
                        {r.schedules.activities?.name ?? "Kegiatan"}
                        <p className="text-xs text-muted-ink">
                          {formatDateOnly(r.schedules.date, "d MMM yyyy")} ·{" "}
                          {formatTime(r.schedules.start_at)}–{formatTime(r.schedules.end_at)}
                        </p>
                      </>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell className="text-muted-ink">{r.notes ?? "-"}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[r.status]}>{STATUS_LABEL[r.status]}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-ink">{formatDateTime(r.created_at)}</TableCell>
                  <TableCell className="text-right">
                    {r.status === "pending" && (
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => updateStatus(r.id, "confirmed")}>
                          Terima
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => updateStatus(r.id, "rejected")}>
                          Tolak
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-ink">
                    Tidak ada pendaftaran.
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
