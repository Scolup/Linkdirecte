// © 2026 typeof (Scolup) | Licensed under AGPL 3.0
import { getConfig, setToken, getSessionGeneration } from './store';
import {
  DEFAULT_CONCURRENCY,
  DEFAULT_MAX_RETRIES,
  DEFAULT_RETRY_DELAY_MS,
  DEFAULT_TIMEOUT_MS,
  SESSION_EXPIRED_CODES,
  SUCCESS_CODES,
  buildApiUrl,
  appendQueryParams,
  buildHeaders,
  buildRequestBody,
  parseJsonResponse,
  sendRequest,
  type HttpMethod,
  type QueryParams,
} from './http';
import { EdApiError, EdAuthError, getFriendlyErrorMessage } from './errors';
import { transform } from './transform';
import { offlineQueue } from './queue';
import { resolveModule, getCacheTtl, buildCacheKey, getFromCache, setInCache } from './cache';
export interface FetchOptions {
  method?: HttpMethod;
  body?: unknown;
  params?: QueryParams;
  skipAuth?: boolean;
  useGtk?: string;
  twofaToken?: string;
  xToken?: string;
  isDownload?: boolean;
  skipQueue?: boolean;
  queued?: boolean;
  returnEnvelope?: boolean;
}

interface PreparedRequest {
  url: URL;
  method: HttpMethod;
  headers: Record<string, string>;
  body?: string;
  options: FetchOptions;
}

let refreshPromise: Promise<string | undefined> | null = null;
const limiters = new Map<number, (fn: () => Promise<any>) => Promise<any>>();

function createLimiter(concurrency: number) {
  const queue: (() => void)[] = [];
  let active = 0;

  const next = () => {
    if (active < concurrency && queue.length > 0) {
      active++;
      queue.shift()!();
    }
  };

  return <T>(fn: () => Promise<T>): Promise<T> => {
    return new Promise<T>((resolve, reject) => {
      queue.push(() => {
        fn()
          .then(resolve, reject)
          .finally(() => {
            active--;
            next();
          });
      });
      next();
    });
  };
}

function getLimiter(concurrency: number) {
  let limiter = limiters.get(concurrency);
  if (!limiter) {
    limiter = createLimiter(concurrency);
    limiters.set(concurrency, limiter);
  }
  return limiter;
}

export async function edFetch<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const startGen = getSessionGeneration();
  const config = getConfig();
  const limiter = getLimiter(config.concurrency ?? DEFAULT_CONCURRENCY);

  const run = async (attempts = 0): Promise<T> => {
    const cacheModule = resolveModule(endpoint);
    const cacheKey = cacheModule ? buildCacheKey(endpoint, options.body) : undefined;
    const ttl = cacheModule ? getCacheTtl(cacheModule) : 0;
    const isCacheable = ttl > 0 && !options.isDownload && !options.returnEnvelope;

    if (isCacheable && cacheKey) {
      const cached = getFromCache<T>(cacheKey);
      if (cached !== undefined) return cached;
    }

    const req = prepareRequest(endpoint, options);
    let response: Response;

    try {
      response = await sendRequest({
        url: req.url.toString(),
        method: req.method,
        headers: req.headers,
        body: req.body,
        timeoutMs: config.timeout ?? DEFAULT_TIMEOUT_MS,
      });
    } catch (error) {
      if (
        config.offlineQueue &&
        !options.skipQueue &&
        !options.skipAuth &&
        options.queued === true
      ) {
        offlineQueue.push(endpoint, options as Record<string, unknown>);
      }
      throw error;
    }

    if (options.isDownload) return response as T;

    const headerToken = response.headers.get('x-token');
    const data = await parseJsonResponse(response);

    if (headerToken) {
      if (startGen === getSessionGeneration()) {
        setToken(headerToken);
        data.token = headerToken;
      }
    }

    if (SESSION_EXPIRED_CODES.has(data.code)) {
      if (attempts >= 1) {
        const rawMsg = data.message || 'Session expired after refresh attempt';
        const friendlyMsg = getFriendlyErrorMessage(String(data.code), rawMsg);
        throw new EdAuthError(friendlyMsg, String(data.code), response.status, data);
      }

      if (!refreshPromise) {
        refreshPromise = refreshSession().finally(() => {
          refreshPromise = null;
        });
      }

      const refreshed = await refreshPromise;
      if (!refreshed) {
        const rawMsg = data.message || 'Session expired';
        const friendlyMsg = getFriendlyErrorMessage(String(data.code), rawMsg);
        throw new EdAuthError(friendlyMsg, String(data.code), response.status, data);
      }

      return run(attempts + 1);
    }

    if (!SUCCESS_CODES.has(data.code)) {
      const rawMsg = data.message || 'API error';
      const friendlyMsg = getFriendlyErrorMessage(String(data.code), rawMsg);
      throw new EdApiError(friendlyMsg, String(data.code), response.status, data);
    }

    if (data.token) {
      if (startGen === getSessionGeneration()) {
        setToken(data.token);
      }
    }

    if (options.returnEnvelope) {
      return data as unknown as T;
    }

    let result = transform(data.data);

    if (isCacheable && cacheKey) {
      if (startGen === getSessionGeneration()) {
        setInCache(cacheKey, result, ttl);
      }
    }

    return result;
  };

  const retries = config.maxRetries ?? DEFAULT_MAX_RETRIES;
  const retryDelay = config.retryDelay ?? DEFAULT_RETRY_DELAY_MS;

  const execute = async () => {
    let currentAttempt = 0;
    let delay = retryDelay;

    while (true) {
      try {
        return await run(0);
      } catch (error: any) {
        currentAttempt++;
        const isRetryable = !(error instanceof EdAuthError || error instanceof EdApiError);
        if (currentAttempt > retries || !isRetryable) {
          throw error;
        }
        if (config.onError) {
          await config.onError(error, async (opts) => {
            await new Promise((r) => setTimeout(r, opts?.delay ?? 1000));
          });
        }
        await new Promise((r) => setTimeout(r, delay));
        delay *= 2;
      }
    }
  };

  return limiter(execute);
}

function prepareRequest(endpoint: string, options: FetchOptions): PreparedRequest {
  const url = buildApiUrl(endpoint);
  appendQueryParams(url, options.params);
  return {
    url,
    method: options.method ?? 'POST',
    headers: buildHeaders({
      skipAuth: options.skipAuth,
      useGtk: options.useGtk,
      twofaToken: options.twofaToken,
      xToken: options.xToken,
    }),
    body: buildRequestBody(endpoint, options.body),
    options,
  };
}

async function refreshSession(): Promise<string | undefined> {
  try {
    const { refreshToken } = await import('../auth');
    const token = await refreshToken();
    setToken(token);
    return token;
  } catch {
    return undefined;
  }
}
