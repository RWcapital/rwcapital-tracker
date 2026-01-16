"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

type Props = {
  publicId: string;
  intervalMs?: number;
};

export default function AutoRefresh({ publicId, intervalMs = 5000 }: Props) {
  const router = useRouter();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    // 1) Best-effort: trigger on-demand fetch from Wise once on mount
    fetch(`/api/transaction/fetch-wise/${publicId}`, { cache: "no-store" }).then(() => {
      router.refresh();
    }).catch(() => {});

    // 2) Periodically: fetch latest from Wise, then refresh SSR
    const t = setInterval(() => {
      fetch(`/api/transaction/fetch-wise/${publicId}`, { cache: "no-store" })
        .finally(() => router.refresh());
    }, intervalMs);

    return () => clearInterval(t);
  }, [publicId, intervalMs, router]);

  return null;
}
