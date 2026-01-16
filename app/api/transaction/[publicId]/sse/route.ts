import { NextRequest } from "next/server";
import { sseBroker, sseHeaders, encodeSSE } from "../../../../../lib/sse";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await ctx.params;
  if (!publicId) {
    return new Response(JSON.stringify({ error: "Missing publicId" }), { status: 400 });
  }

  let ctrl: ReadableStreamDefaultController<Uint8Array> | null = null;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      ctrl = controller;
      // Subscribe this client
      sseBroker.subscribe(publicId, controller);

      // Send initial hello
      controller.enqueue(new TextEncoder().encode(": connected\n\n"));

      // Heartbeat to keep connections alive
      const hb = setInterval(() => {
        try { controller.enqueue(new TextEncoder().encode(": hb\n\n")); } catch {}
      }, 15000);

      // Save heartbeat id on controller for potential cleanup
      (controller as any)._hb = hb;
    },
    cancel() {
      if (ctrl) {
        const hb = (ctrl as any)._hb as ReturnType<typeof setInterval> | undefined;
        if (hb) clearInterval(hb);
        sseBroker.unsubscribe(publicId, ctrl);
        try { ctrl.close(); } catch {}
      }
    },
  });

  const response = new Response(stream, { headers: sseHeaders() });
  return response;
}
