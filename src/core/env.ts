// © 2026 typeof (Scolup) | Licensed under AGPL 3.0
let _polyfill: Crypto | null = null;

export async function getWebCrypto(): Promise<Crypto> {
  if (globalThis.crypto?.subtle) return globalThis.crypto;
  if (_polyfill) return _polyfill;
  const mod = await import('msrcrypto');
  _polyfill = (mod.default ?? mod) as Crypto;
  return _polyfill;
}

export function randomUUID(): string {
  const c = globalThis.crypto as { randomUUID?: () => string } | undefined;
  if (c?.randomUUID) return c.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    return (ch === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export function signalWithTimeout(ms: number): AbortSignal {
  if (typeof AbortSignal.timeout === 'function') {
    return AbortSignal.timeout(ms);
  }
  const controller = new AbortController();
  setTimeout(() => controller.abort(), ms);
  return controller.signal;
}

export function safeSetInterval(
  fn: () => void | Promise<void>,
  ms: number,
): ReturnType<typeof setInterval> | undefined {
  try {
    return setInterval(fn, ms);
  } catch {
    return undefined;
  }
}

export function safeClearInterval(handle: ReturnType<typeof setInterval> | undefined): void {
  if (handle != null) {
    try {
      clearInterval(handle);
    } catch {}
  }
}

export function isFormData(value: unknown): value is FormData {
  try {
    return typeof FormData !== 'undefined' && value instanceof FormData;
  } catch {
    return false;
  }
}
