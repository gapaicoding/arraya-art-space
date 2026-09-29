"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * Standard inline field at the top of Rekap Penjualan/Pengeluaran — not a
 * modal. Remembers "who is physically entering data on this device"
 * separately from the logged-in Supabase Auth account (staff can share a
 * device across a shift).
 */
export function InputterBanner({
  inputterName,
  hydrated,
  onSetName,
}: {
  inputterName: string | null;
  hydrated: boolean;
  onSetName: (name: string) => void;
}) {
  const [draft, setDraft] = useState(inputterName ?? "");

  useEffect(() => {
    if (hydrated) setDraft(inputterName ?? "");
  }, [hydrated, inputterName]);

  function save() {
    const trimmed = draft.trim();
    if (!trimmed || trimmed === inputterName) return;
    onSetName(trimmed);
  }

  return (
    <div className="glass rounded-[22px] p-4">
      <label htmlFor="inputter-name" className="text-sm text-muted-ink">
        Nama Penginput
      </label>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Input
          id="inputter-name"
          placeholder="Ketik nama penginput..."
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
          }}
          className="max-w-xs"
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={save}
          disabled={!draft.trim() || draft.trim() === inputterName}
        >
          Simpan
        </Button>
        {!inputterName && hydrated && (
          <p className="text-xs text-destructive">
            Isi nama penginput dulu sebelum mencatat transaksi.
          </p>
        )}
      </div>
    </div>
  );
}
