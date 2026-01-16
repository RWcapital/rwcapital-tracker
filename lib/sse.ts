type Controller = ReadableStreamDefaultController<Uint8Array>;

class SSEBroker {
  private topics: Map<string, Set<Controller>> = new Map();

  subscribe(topic: string, controller: Controller) {
    if (!this.topics.has(topic)) this.topics.set(topic, new Set());
    this.topics.get(topic)!.add(controller);
  }

  unsubscribe(topic: string, controller: Controller) {
    const set = this.topics.get(topic);
    if (!set) return;
    set.delete(controller);
    if (set.size === 0) this.topics.delete(topic);
  }

  publish(topic: string, data: any) {
    const set = this.topics.get(topic);
    if (!set || set.size === 0) return;
    const msg = `data: ${JSON.stringify(data)}\n\n`;
    const bytes = new TextEncoder().encode(msg);
    for (const ctrl of set) {
      try {
        ctrl.enqueue(bytes);
      } catch {}
    }
  }
}

export const sseBroker = new SSEBroker();

export function sseHeaders() {
  return {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  } as Record<string, string>;
}

export function encodeSSE(data: any) {
  return new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`);
}
