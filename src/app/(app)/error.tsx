"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="glass w-full max-w-md rounded-[22px] p-6">
        <p className="text-2xl">⚠️</p>
        <h2 className="mt-2 font-display text-xl font-bold">Terjadi kesalahan</h2>
        <p className="mt-2 text-sm text-muted-ink">
          Maaf, terjadi kesalahan saat memuat halaman ini. Silakan coba lagi.
          Jika masalah berlanjut, hubungi admin.
        </p>
        <Button className="mt-4 h-10 w-full" onClick={() => reset()}>
          Coba Lagi
        </Button>
      </div>
    </div>
  );
}
