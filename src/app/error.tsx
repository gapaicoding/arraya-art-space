"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
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
    <html lang="id">
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#faf7f2] p-6 text-center">
          <div className="w-full max-w-md rounded-[22px] border border-black/5 bg-white p-6 shadow-sm">
            <p className="text-2xl">⚠️</p>
            <h2 className="mt-2 text-xl font-bold">Terjadi kesalahan</h2>
            <p className="mt-2 text-sm text-neutral-500">
              Maaf, aplikasi mengalami kesalahan yang tidak terduga. Silakan
              muat ulang halaman.
            </p>
            <Button className="mt-4 h-10 w-full" onClick={() => reset()}>
              Coba Lagi
            </Button>
          </div>
        </div>
      </body>
    </html>
  );
}
