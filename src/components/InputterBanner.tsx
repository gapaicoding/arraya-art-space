"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/**
 * Shown at the top of Rekap Penjualan/Pengeluaran. Blocks with a dialog
 * until an inputter name is set for this device/session (can't be
 * dismissed without filling it in), then shows a small banner with a
 * "Ganti" button to change it later in the same session.
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
  const [forceOpen, setForceOpen] = useState(false);
  const [draft, setDraft] = useState("");

  const open = forceOpen || (hydrated && !inputterName);

  function submit() {
    const trimmed = draft.trim();
    if (!trimmed) return;
    onSetName(trimmed);
    setForceOpen(false);
    setDraft("");
  }

  return (
    <>
      <div className="glass flex flex-wrap items-center justify-between gap-2 rounded-[22px] p-4">
        <p className="text-sm text-muted-ink">
          Penginput saat ini:{" "}
          <span className="font-medium text-ink">{inputterName ?? "-"}</span>
        </p>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setDraft(inputterName ?? "");
            setForceOpen(true);
          }}
        >
          Ganti
        </Button>
      </div>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          // Can't be dismissed (escape, outside click, X button) without
          // an inputter name already set — this is the initial mandatory
          // prompt, not an optional dialog.
          if (!next && !inputterName) return;
          setForceOpen(next);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Siapa yang input data sekarang?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-ink">
            Nama ini akan diingat di perangkat ini untuk transaksi berikutnya, sampai diganti
            manual lewat tombol &quot;Ganti&quot;.
          </p>
          <Input
            placeholder="Nama penginput"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
            }}
            autoFocus
          />
          <Button className="w-full" onClick={submit} disabled={!draft.trim()}>
            Simpan
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
