// © 2026 typeof (Scolup) | Licensed under AGPL 3.0
import { getConfig, getToken, getTwofaToken } from './store';
import {
  EdNetworkError,
  EdRateLimitError,
  EdServerError,
  EdParseError,
  EdTimeoutError,
} from './errors';
import { signalWithTimeout, isFormData } from './env';

export const BASE_API_URL = 'https://api.ecoledirecte.com/v3';

export const ED_VERSION = '7.14.3';

export const DEFAULT_TIMEOUT_MS = 15_000;
export const DEFAULT_MAX_RETRIES = 3;
export const DEFAULT_RETRY_DELAY_MS = 500;
export const DEFAULT_CONCURRENCY = 3;

export const SUCCESS_CODES = new Set([200, 250]);
export const SESSION_EXPIRED_CODES = new Set([520, 521, 525]);

export const DOWNLOAD_ENDPOINTS = ['telechargement.awp', 'televersement.awp'] as const;

export type QueryParams = Record<string, string | number>;

export function buildApiUrl(endpoint: string): URL {
  const config = getConfig();
  const baseUrl = config.proxyUrl || BASE_API_URL;
  const fullUrl = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint}`;

  const url = new URL(fullUrl);
  if (!endpoint.startsWith('http') && !url.searchParams.has('v')) {
    url.searchParams.set('v', ED_VERSION);
  }
  return url;
}

export function appendQueryParams(url: URL, params?: QueryParams): void {
  if (!params) return;

  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.append(key, String(value));
  });
}

export function isDownloadEndpoint(endpoint: string): boolean {
  return DOWNLOAD_ENDPOINTS.some((downloadEndpoint) => endpoint.includes(downloadEndpoint));
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export interface RequestHeaderOptions {
  skipAuth?: boolean;
  useGtk?: string;
  twofaToken?: string;
  xToken?: string;
}

export interface SendRequestOptions {
  url: string;
  method: HttpMethod;
  headers: Record<string, string>;
  body?: string;
  timeoutMs?: number;
}

export function buildHeaders(options: RequestHeaderOptions = {}): Record<string, string> {
  const config = getConfig();

  const headers: Record<string, string> = {
    'Content-Type': 'application/x-www-form-urlencoded',
    'X-Requested-With': 'typeof.scolup.linkdirecte',
  };

  if (config.proxyUrl) {
    headers['X-Procsy-User-Agent'] = config.userAgent || '';
    headers['X-Procsy-Base-URL'] = BASE_API_URL.replace(/^https?:\/\//, '');
  } else {
    headers['User-Agent'] = config.userAgent || '';
  }

  if (!options.skipAuth) {
    const token = options.xToken || getToken();
    if (token) {
      headers['X-Token'] = token;
    }
    const twofaToken = options.twofaToken || getTwofaToken();
    if (twofaToken) {
      headers['2FA-Token'] = twofaToken;
    }
  }

  if (options.useGtk) {
    headers['X-GTK'] = options.useGtk;
    headers['Cookie'] = `GTK=${options.useGtk}`;
  }

  return headers;
}

export function buildRequestBody(endpoint: string, body?: unknown): string | undefined {
  if (!hasBody(body)) return undefined;

  if (isDownloadEndpoint(endpoint)) {
    return buildFormBody(body);
  }

  return `data=${encodeURIComponent(JSON.stringify(body))}`;
}

export async function sendRequest(options: SendRequestOptions): Promise<Response> {
  try {
    return await fetch(options.url, {
      method: options.method,
      headers: options.headers,
      body: options.body,
      signal: signalWithTimeout(options.timeoutMs || DEFAULT_TIMEOUT_MS),
    });
  } catch (error: any) {
    if (
      error.name === 'AbortError' ||
      error.message?.toLowerCase().includes('timeout') ||
      error.message?.toLowerCase().includes('aborted')
    ) {
      throw new EdTimeoutError(
        `Request to ${options.url} timed out after ${options.timeoutMs || DEFAULT_TIMEOUT_MS}ms`,
        'TIMEOUT_ERROR',
        0,
        error,
      );
    }
    throw new EdNetworkError(error.message, 'NETWORK_ERROR', 0, error);
  }
}

export async function parseJsonResponse(response: Response): Promise<any> {
  if (response.status === 429) {
    throw new EdRateLimitError('Rate limit exceeded', 'RATE_LIMIT', 429);
  }

  if (response.status >= 500) {
    throw new EdServerError(`Server error: ${response.status}`, 'SERVER_ERROR', response.status);
  }

  const clonedResponse = response.clone();
  try {
    return await response.json();
  } catch (error: any) {
    const text = await clonedResponse.text().catch(() => '');
    throw new EdParseError(
      `Failed to parse response as JSON (HTTP ${response.status}): ${text.slice(0, 200)}`,
      'PARSE_ERROR',
      response.status,
      error,
    );
  }
}

function buildFormBody(body: unknown): string | undefined {
  if (isFormData(body)) return undefined;
  if (typeof body === 'string') return body;
  if (isPlainObject(body)) {
    return new URLSearchParams(
      Object.entries(body).map(([key, value]) => [key, String(value)] as [string, string]),
    ).toString();
  }

  return String(body);
}

function hasBody(body: unknown): body is NonNullable<unknown> {
  return body !== undefined && body !== null;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !isFormData(value);
}
