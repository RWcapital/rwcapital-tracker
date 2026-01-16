"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SSERefresh({ publicId }: { publicId: string }) {
  const router = useRouter();

  useEffect(() => {
    const url = `/api/transaction/${publicId}/sse`;
    const es = new EventSource(url);

    es.onmessage = () => {
      router.refresh();
    };
    es.onerror = () => {
      // Keep silent; EventSource will auto-reconnect
    };

    return () => {
      try { es.close(); } catch {}
    };
  }, [publicId, router]);

  return null;
}
