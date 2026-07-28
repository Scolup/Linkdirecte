// © 2026 typeof (Scolup) | Licensed under AGPL 3.0
import type { StorageAdapter } from '../types';
import { getWebCrypto } from './env';

const ALGORITHM = 'AES-GCM';
const SALT_LEN = 16;
const IV_LEN = 12;
const KEY_LEN = 32;
const KDF_ITERATIONS = 100_000;

async function deriveKey(secret: string, salt: Uint8Array): Promise<CryptoKey> {
  const webCrypto = await getWebCrypto();
  const keyMaterial = await webCrypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  return webCrypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as any,
      iterations: KDF_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: ALGORITHM, length: KEY_LEN * 8 },
    false,
    ['encrypt', 'decrypt'],
  );
}

async function encrypt(plaintext: string, secret: string): Promise<string> {
  const webCrypto = await getWebCrypto();
  const salt = webCrypto.getRandomValues(new Uint8Array(SALT_LEN));
  const key = await deriveKey(secret, salt);
  const iv = webCrypto.getRandomValues(new Uint8Array(IV_LEN));
  const encrypted = await webCrypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    key,
    new TextEncoder().encode(plaintext),
  );
  const result = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
  result.set(salt, 0);
  result.set(iv, salt.length);
  result.set(new Uint8Array(encrypted), salt.length + iv.length);
  let binary = '';
  for (let i = 0; i < result.length; i++) {
    binary += String.fromCharCode(result[i]);
  }
  return btoa(binary);
}

async function decrypt(data: string, secret: string): Promise<string> {
  const webCrypto = await getWebCrypto();
  const binary = atob(data);
  const buf = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    buf[i] = binary.charCodeAt(i);
  }
  if (buf.length < SALT_LEN + IV_LEN) {
    throw new Error('Invalid encrypted data');
  }
  const salt = buf.subarray(0, SALT_LEN);
  const iv = buf.subarray(SALT_LEN, SALT_LEN + IV_LEN);
  const ciphertext = buf.subarray(SALT_LEN + IV_LEN);
  const key = await deriveKey(secret, salt);
  const decrypted = await webCrypto.subtle.decrypt({ name: ALGORITHM, iv }, key, ciphertext);
  return new TextDecoder().decode(decrypted);
}

export const memoryStorage: StorageAdapter = (() => {
  const data = new Map<string, string>();
  return {
    get: (key) => data.get(key) || null,
    set: (key, value) => {
      data.set(key, value);
    },
    delete: (key) => {
      data.delete(key);
    },
  };
})();

export const localStorageStorage: StorageAdapter = (() => {
  function getStorage(): Storage {
    if (typeof globalThis.localStorage === 'undefined') {
      throw new Error('localStorage is not available in this environment.');
    }
    return globalThis.localStorage;
  }
  return {
    get: (key) => getStorage().getItem(key),
    set: (key, value) => getStorage().setItem(key, value),
    delete: (key) => getStorage().removeItem(key),
  };
})();

function openIDB(): Promise<any> {
  return new Promise((resolve, reject) => {
    const req = (globalThis as any).indexedDB.open('linkdirecte', 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('data')) {
        db.createObjectStore('data');
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export const indexedDBStorage: StorageAdapter = (() => {
  let dbPromise: Promise<any> | null = null;
  const getDB = () => {
    if (!dbPromise) {
      dbPromise = openIDB();
    }
    return dbPromise;
  };
  return {
    get: async (key) => {
      try {
        const db = await getDB();
        return new Promise<string | null>((resolve) => {
          const tx = db.transaction('data', 'readonly');
          const req = tx.objectStore('data').get(key);
          req.onsuccess = () => resolve(req.result ?? null);
          req.onerror = () => resolve(null);
        });
      } catch {
        return null;
      }
    },
    set: async (key, value) => {
      try {
        const db = await getDB();
        return new Promise<void>((resolve) => {
          const tx = db.transaction('data', 'readwrite');
          const req = tx.objectStore('data').put(value, key);
          req.onsuccess = () => resolve();
          req.onerror = () => resolve();
        });
      } catch {}
    },
    delete: async (key) => {
      try {
        const db = await getDB();
        return new Promise<void>((resolve) => {
          const tx = db.transaction('data', 'readwrite');
          const req = tx.objectStore('data').delete(key);
          req.onsuccess = () => resolve();
          req.onerror = () => resolve();
        });
      } catch {}
    },
  };
})();

export function nodeStorage(filePath = './linkdirecte-session.json'): StorageAdapter {
  const readAll = async (): Promise<Record<string, string>> => {
    const { readFile } = await import('node:fs/promises');
    try {
      return JSON.parse(await readFile(filePath, 'utf-8'));
    } catch {
      return {};
    }
  };
  const writeAll = async (data: Record<string, string>): Promise<void> => {
    const { writeFile, mkdir } = await import('node:fs/promises');
    const { dirname } = await import('node:path');
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, JSON.stringify(data, null, 2));
  };
  return asyncStorage({
    getItem: async (k) => (await readAll())[k] ?? null,
    setItem: async (k, v) => {
      const data = await readAll();
      data[k] = v;
      await writeAll(data);
    },
    removeItem: async (k) => {
      const data = await readAll();
      delete data[k];
      await writeAll(data);
    },
  });
}

export function cloudflareKVStorage(namespace: {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
}): StorageAdapter {
  return asyncStorage({
    getItem: (k) => namespace.get(k),
    setItem: (k, v) => namespace.put(k, v),
    removeItem: (k) => namespace.delete(k),
  });
}

export function asyncStorage(backend: {
  getItem(key: string): string | null | Promise<string | null>;
  setItem(key: string, value: string): void | Promise<void>;
  removeItem(key: string): void | Promise<void>;
}): StorageAdapter {
  return {
    get: (key) => backend.getItem(key),
    set: (key, value) => backend.setItem(key, value),
    delete: (key) => backend.removeItem(key),
  };
}

const encryptedCache = new WeakMap<StorageAdapter, Map<string, StorageAdapter>>();

export function encryptedStorage(backend: StorageAdapter, secret: string): StorageAdapter {
  let backendMap = encryptedCache.get(backend);
  if (!backendMap) {
    backendMap = new Map();
    encryptedCache.set(backend, backendMap);
  }
  let cached = backendMap.get(secret);
  if (!cached) {
    cached = {
      get: async (key) => {
        const val = await backend.get(key);
        if (!val) return null;
        try {
          return await decrypt(val, secret);
        } catch {
          return null;
        }
      },
      set: async (key, value) => {
        const encrypted = await encrypt(value, secret);
        await backend.set(key, encrypted);
      },
      delete: async (key) => {
        await backend.delete(key);
      },
    };
    Object.defineProperties(cached, {
      __encryptedWithSecret: { value: secret, writable: true },
      __rawStorage: { value: backend, writable: true },
    });
    backendMap.set(secret, cached);
  }
  return cached;
}
