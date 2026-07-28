// © 2026 typeof (Scolup) | Licensed under AGPL 3.0
type Handler = (data: any) => void;

class EventEmitter {
  private events: Map<string, Set<Handler>> = new Map();

  on(event: string, handler: Handler): () => void {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    this.events.get(event)!.add(handler);
    return () => this.off(event, handler);
  }

  off(event: string, handler: Handler): void {
    const handlers = this.events.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  emit(event: string, data: any): void {
    const handlers = this.events.get(event);
    if (handlers) {
      handlers.forEach((handler) => handler(data));
    }
  }
}

export const emitter = new EventEmitter();
