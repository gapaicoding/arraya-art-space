"use client";

import { useState } from "react";
import { toast } from "sonner";
import { AppShell, PrimaryButton } from "@/components/AppShell";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/client";
import type { BusinessHour } from "@/lib/supabase/types";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { DAY_NAMES_ID } from "@/lib/format";

export function BusinessHoursClient({ initialHours }: { initialHours: BusinessHour[] }) {
  const { isAdmin } = useAuth();
  const [rows, setRows] = useState<BusinessHour[]>(() => {
    // ensure 7 rows exist even if DB empty
    const byDay = new Map(initialHours.map((h) => [h.day_of_week, h]));
    return Array.from({ length: 7 }, (_, i) => {
      const day = ((i + 1) % 7); // Monday(1) first, Sunday(0) last, matching PRD sample order
      return (
        byDay.get(day) ?? {
          id: "",
          day_of_week: day,
          is_closed: day === 0,
          open_time: "09:00",
          close_time: "18:00",
          updated_at: "",
          updated_by: null,
        }
      );
    });
  });
  const [saving, setSaving] = useState(false);

  function updateRow(day: number, patch: Partial<BusinessHour>) {
    setRows((prev) => prev.map((r) => (r.day_of_week === day ? { ...r, ...patch } : r)));
  }

  async function saveAll() {
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from("business_hours").upsert(
      rows.map((r) => ({
        day_of_week: r.day_of_week,
        is_closed: r.is_closed,
        open_time: r.is_closed ? null : r.open_time,
        close_time: r.is_closed ? null : r.close_time,
      })),
      { onConflict: "day_of_week" },
    );
    setSaving(false);
    if (error) {
      toast.error("Gagal menyimpan: " + error.message);
      return;
    }
    toast.success("Jam operasional disimpan");
  }

  return (
    <AppShell
      title="Jam Operasional"
      subtitle="Atur jam buka & tutup per hari"
      action={
        isAdmin ? (
          <PrimaryButton onClick={saveAll} disabled={saving}>
            {saving ? "Menyimpan..." : "Simpan"}
          </PrimaryButton>
        ) : undefined
      }
    >
      <div className="glass rounded-[22px] p-4">
        <div className="divide-y divide-frost/60">
          {rows.map((row) => (
            <div key={row.day_of_week} className="flex flex-wrap items-center gap-4 py-3">
              <div className="w-28 font-medium">{DAY_NAMES_ID[row.day_of_week]}</div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={!row.is_closed}
                  disabled={!isAdmin}
                  onCheckedChange={(checked) =>
                    updateRow(row.day_of_week, {
                      is_closed: !checked,
                      // Switching a previously-closed day to open often leaves
                      // open_time/close_time empty (null from the DB) — fill
                      // in sensible defaults instead of showing "--:-- --".
                      ...(checked && !row.open_time ? { open_time: "10:30" } : {}),
                      ...(checked && !row.close_time ? { close_time: "20:45" } : {}),
                    })
                  }
                />
                <span className="text-sm text-muted-ink">
                  {row.is_closed ? "Tutup" : "Buka"}
                </span>
              </div>
              {!row.is_closed && (
                <div className="flex items-center gap-2">
                  <Input
                    type="time"
                    className="w-32"
                    disabled={!isAdmin}
                    value={row.open_time ?? ""}
                    onChange={(e) => updateRow(row.day_of_week, { open_time: e.target.value })}
                  />
                  <span className="text-muted-ink">–</span>
                  <Input
                    type="time"
                    className="w-32"
                    disabled={!isAdmin}
                    value={row.close_time ?? ""}
                    onChange={(e) => updateRow(row.day_of_week, { close_time: e.target.value })}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
