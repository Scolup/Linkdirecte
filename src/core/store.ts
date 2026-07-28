// © 2026 typeof (Scolup) | Licensed under AGPL 3.0
import { EdConfig, StorageAdapter, Account } from '../types';
import {
  indexedDBStorage,
  localStorageStorage,
  nodeStorage,
  memoryStorage,
  encryptedStorage,
} from './storage';
import { ED_VERSION } from './http';

export let DEFAULT_USER_AGENT = '';

export interface EdState {
  config: EdConfig;
  token?: string;
  twofaToken?: string;
  account?: Account;
  accounts?: Account[];
  lastTokenRefresh?: Date;
  rawStorage?: StorageAdapter;
  hasDetectedStorage?: boolean;
}

let sessionGen = 0;

export function getSessionGeneration(): number {
  return sessionGen;
}

export function incrementSessionGeneration(): void {
  sessionGen++;
}

const state: EdState = {
  config: {
    maxRetries: 3,
    retryDelay: 500,
    concurrency: 3,
    timeout: 15000,
    offlineQueue: false,
    userAgent: '',
  },
};

export function getConfig(): EdConfig {
  if (!DEFAULT_USER_AGENT) {
    DEFAULT_USER_AGENT = `Linkdirecte/1.0 (iPhone; CPU OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5.2 Mobile/15E148 EDMOBILE v${ED_VERSION}`;
  }
  if (!state.config.userAgent) {
    state.config.userAgent = DEFAULT_USER_AGENT;
  }
  if (!state.config.storage && !state.hasDetectedStorage) {
    setConfig({});
  }
  return state.config;
}

export function setConfig(config: Partial<EdConfig>): void {
  if ('storage' in config) {
    state.rawStorage = config.storage;
    state.hasDetectedStorage = config.storage !== undefined;
  } else if (!state.hasDetectedStorage && !state.rawStorage && !state.config.storage) {
    state.hasDetectedStorage = true;
    const proc = (globalThis as any).process;
    state.rawStorage =
      typeof (globalThis as any).indexedDB !== 'undefined'
        ? indexedDBStorage
        : typeof (globalThis as any).localStorage !== 'undefined'
          ? localStorageStorage
          : proc && proc.versions && (proc.versions.node != null || proc.versions.bun != null)
            ? nodeStorage()
            : memoryStorage;
  }

  state.config = { ...state.config, ...config };
  const passkey = state.config.passkey;
  state.config.storage = state.rawStorage
    ? passkey
      ? encryptedStorage(state.rawStorage, passkey)
      : state.rawStorage
    : undefined;
}

export function getToken(): string | undefined {
  return state.token;
}

export function setToken(token: string): void {
  state.token = token;
  state.lastTokenRefresh = new Date();
}

export function getTwofaToken(): string | undefined {
  return state.twofaToken;
}

export function setTwofaToken(token: string): void {
  state.twofaToken = token;
}

export function getLastTokenRefresh(): Date | undefined {
  return state.lastTokenRefresh;
}

export function getAccount(): Account | undefined {
  return state.account;
}

export function setAccount(account: Account): void {
  state.account = account;
}

export function getAccounts(): Account[] {
  return state.accounts || [];
}

export function setAccounts(accounts: Account[]): void {
  state.accounts = accounts;
}

export async function switchAccount(accountId: number): Promise<void> {
  if (!state.accounts) {
    throw new Error('No accounts available to switch');
  }
  const found = state.accounts.find((acc) => acc.id === accountId);
  if (!found) {
    throw new Error(`Account with ID ${accountId} not found`);
  }
  state.account = found;
  await persistSession();
}

const STORAGE_KEYS = {
  token: 'ed_tk',
  twofaToken: 'ed_tft',
  account: 'ed_acc',
  accounts: 'ed_accs',
  lastRefresh: 'ed_lr',
} as const;

export async function persistSession(): Promise<void> {
  const storage = getConfig().storage;
  if (!storage) return;

  if (state.token) await storage.set(STORAGE_KEYS.token, state.token);
  if (state.twofaToken) await storage.set(STORAGE_KEYS.twofaToken, state.twofaToken);
  if (state.account) await storage.set(STORAGE_KEYS.account, JSON.stringify(state.account));
  if (state.accounts) await storage.set(STORAGE_KEYS.accounts, JSON.stringify(state.accounts));
  if (state.lastTokenRefresh)
    await storage.set(STORAGE_KEYS.lastRefresh, state.lastTokenRefresh.toISOString());
}

export async function clearSession(): Promise<void> {
  state.token = undefined;
  state.twofaToken = undefined;
  state.account = undefined;
  state.accounts = undefined;
  state.lastTokenRefresh = undefined;

  incrementSessionGeneration();

  try {
    const { clearCache } = await import('./cache');
    clearCache();
  } catch {}

  try {
    const { offlineQueue } = await import('./queue');
    offlineQueue.clear();
  } catch {}

  const storage = getConfig().storage;
  if (!storage) return;

  await storage.delete(STORAGE_KEYS.token);
  await storage.delete(STORAGE_KEYS.twofaToken);
  await storage.delete(STORAGE_KEYS.account);
  await storage.delete(STORAGE_KEYS.accounts);
  await storage.delete(STORAGE_KEYS.lastRefresh);
  await storage.delete('ed_offline_queue');
}

export async function loadSession(): Promise<boolean> {
  const storage = getConfig().storage;
  if (!storage) return false;

  try {
    const [token, twofaToken, accountStr, accountsStr, lastRefreshStr] = await Promise.all([
      storage.get(STORAGE_KEYS.token),
      storage.get(STORAGE_KEYS.twofaToken),
      storage.get(STORAGE_KEYS.account),
      storage.get(STORAGE_KEYS.accounts),
      storage.get(STORAGE_KEYS.lastRefresh),
    ]);

    let loaded = false;
    if (token) {
      state.token = token;
      loaded = true;
    }
    if (twofaToken) state.twofaToken = twofaToken;
    if (accountStr) {
      try {
        state.account = JSON.parse(accountStr);
        loaded = true;
      } catch {}
    }
    if (accountsStr) {
      try {
        state.accounts = JSON.parse(accountsStr);
      } catch {}
    }
    if (lastRefreshStr) {
      const parsed = new Date(lastRefreshStr);
      if (!isNaN(parsed.getTime())) {
        state.lastTokenRefresh = parsed;
      }
    }

    if (loaded) {
      const { startTokenKeepalive } = await import('./health');
      startTokenKeepalive();
    }

    return loaded;
  } catch {
    return false;
  }
}
