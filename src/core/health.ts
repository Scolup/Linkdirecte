// © 2026 typeof (Scolup) | Licensed under AGPL 3.0
import { getConfig, getToken } from './store';
import { buildApiUrl, buildHeaders, sendRequest, parseJsonResponse } from './http';
import { safeSetInterval, safeClearInterval } from './env';

const TOKEN_CHECK_ENDPOINT = '/rdt/sondages.awp?verbe=get';
const TOKEN_CHECK_BODY = 'data=%7B%7D';
const KEEPALIVE_INTERVAL_MS = 45 * 60 * 1000;

let keepaliveTimer: ReturnType<typeof setInterval> | undefined | null = null;

export async function checkTokenHealth(): Promise<boolean> {
  const token = getToken();
  if (!token) return false;

  try {
    const url = buildApiUrl(TOKEN_CHECK_ENDPOINT);
    const headers = buildHeaders();
    const response = await sendRequest({
      url: url.toString(),
      method: 'POST',
      headers,
      body: TOKEN_CHECK_BODY,
    });
    const data = await parseJsonResponse(response);
    return data.code === 200;
  } catch {
    return false;
  }
}

export function startTokenKeepalive(): void {
  stopTokenKeepalive();

  keepaliveTimer = safeSetInterval(async () => {
    const valid = await checkTokenHealth();
    if (!valid) {
      try {
        const { refreshToken } = await import('../auth');
        await refreshToken();
      } catch (error) {
        stopTokenKeepalive();
        getConfig().onError?.(error, async () => {});
      }
    }
  }, KEEPALIVE_INTERVAL_MS);
}

export function stopTokenKeepalive(): void {
  safeClearInterval(keepaliveTimer ?? undefined);
  keepaliveTimer = null;
}
