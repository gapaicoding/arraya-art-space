"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatDateTime } from "@/lib/format";

export interface InputterLogEntry {
  name: string;
  created_at: string;
}

/**
 * "Who is physically entering data on this device" — separate from the
 * logged-in Supabase Auth account, since staff can share a device across
 * a shift. `inputterName` is this browser session's confirmed name
 * (localStorage, via useInputterSession); `lastInputter` and `history`
 * are read from actual transaction rows, so they reflect reality even
 * before this session has confirmed anything.
 *
 * Editing is an inline reveal, not a modal — dismissible any time, never
 * blocks the page.
 */
export function InputterBanner({
  label,
  inputterName,
  hydrated,
  onSetName,
  lastInputter,
  history,
}: {
  label: string;
  inputterName: string | null;
  hydrated: boolean;
  onSetName: (name: string) => void;
  lastInputter: InputterLogEntry | null;
  history: InputterLogEntry[];
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);

  function openEdit() {
    setDraft(inputterName ?? lastInputter?.name ?? "");
    setEditing(true);
  }

  function save() {
    const trimmed = draft.trim();
    if (!trimmed) return;
    onSetName(trimmed);
    setEditing(false);
  }

  return (
    <div className="glass rounded-[22px] p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-faint-ink">
            {label}
          </p>
          <p className="mt-1 font-display text-xl font-bold">
            {hydrated ? (inputterName ?? "Belum diatur") : "Memuat…"}
          </p>
          <p className="mt-1 text-sm text-muted-ink">
            {inputterName
              ? "Transaksi berikutnya akan tercatat atas nama ini."
              : "Nama penginput wajib diisi sebelum mencatat data."}
          </p>
          {lastInputter && (
            <p className="mt-2 text-xs text-faint-ink">
              Penginput terakhir: {lastInputter.name} ·{" "}
              {formatDateTime(lastInputter.created_at)}
            </p>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={openEdit}>
            ✏️ {inputterName ? "Ganti" : "Isi"} Nama Penginput
          </Button>
          <Button size="sm" variant="outline" onClick={() => setHistoryOpen(true)}>
            🕒 Riwayat Penginput
          </Button>
        </div>
      </div>

      {editing && (
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border/60 pt-4">
          <Input
            placeholder="Ketik nama penginput..."
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") save();
              if (e.key === "Escape") setEditing(false);
            }}
            className="max-w-xs"
            autoFocus
          />
          <Button size="sm" onClick={save} disabled={!draft.trim()}>
            Simpan
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
            Batal
          </Button>
        </div>
      )}

      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Riwayat Penginput</DialogTitle>
          </DialogHeader>
          {history.length === 0 ? (
            <p className="text-sm text-muted-ink">Belum ada transaksi tercatat.</p>
          ) : (
            <ul className="max-h-80 space-y-2 overflow-y-auto">
              {history.map((h, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between rounded-xl border border-border/60 px-3 py-2 text-sm"
                >
                  <span className="font-medium">{h.name}</span>
                  <span className="text-muted-ink">{formatDateTime(h.created_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
