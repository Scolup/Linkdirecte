// © 2026 typeof (Scolup) | Licensed under AGPL 3.0
export {
  setConfig as configure,
  loadSession,
  clearSession,
  getAccount,
  getAccounts,
  switchAccount,
  getLastTokenRefresh,
} from './core/store';
export {
  memoryStorage,
  localStorageStorage,
  indexedDBStorage,
  nodeStorage,
  cloudflareKVStorage,
  asyncStorage,
  encryptedStorage,
} from './core/storage';
export { checkTokenHealth, startTokenKeepalive, stopTokenKeepalive } from './core/health';
export { download, downloadPhoto } from './core/downloader';
export { offlineQueue } from './core/queue';
export { prefetchAll, startAutoPrefetch, stopAutoPrefetch } from './core/prefetch';

export { login, logout, refreshToken } from './auth';

export * from './modules/settings';
export * from './modules/grades';
export * from './modules/timetable';
export * from './modules/messages';
export * from './modules/homework';
export * from './modules/timeline';
export * from './modules/attendance';
export * from './modules/cloud';
export * from './modules/documents';
export * from './modules/forms';
export { startPolling, stopPolling, on, off } from './modules/listen';

export * from './types';
export * from './core/errors';
