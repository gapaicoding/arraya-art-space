"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function ShareButton({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: `${title} — Arayya Art & Space`, url });
      } catch {
        // User cancelled the share sheet — not an error worth surfacing.
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked (rare, permissions) — silently no-op, link is
      // still visible in the address bar for the visitor to copy manually.
    }
  }

  return (
    <Button variant="outline" className="w-full" onClick={handleShare}>
      {copied ? "Tautan Disalin!" : "Bagikan Event"}
    </Button>
  );
}
