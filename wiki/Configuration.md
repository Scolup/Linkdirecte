<p align="center">
  <picture><source media="(prefers-color-scheme: light)" srcset="https://shieldcn.dev/header/glow.svg?title=Configuration&amp;subtitle=Learn+how+to+configure+Linkdirecte.&amp;logo=lu%3ASettings2&amp;mode=light&amp;theme=blue&amp;align=left" /><img alt="Configuration | Learn how to configure Linkdirecte." src="https://shieldcn.dev/header/glow.svg?title=Configuration&amp;subtitle=Learn+how+to+configure+Linkdirecte.&amp;logo=lu%3ASettings2&amp;mode=dark&amp;theme=blue&amp;align=left" /></picture>
</p>

You can configure global SDK behaviors (such as request timeouts, retry behavior, caching, and offline queues) globally by calling the `configure` (exported as `configure` or `setConfig`) function.

### `configure`

```typescript
import { configure } from "@scolup/linkdirecte";

configure({
  maxRetries: 5,
  retryDelay: 1000,
  timeout: 10000, // 10 seconds timeout
  offlineQueue: true, // Queue actions if offline!
});
```

### All Configuration Options (`EdConfig`)

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `userAgent` | `string` | *(Modern iOS mobile user agent)* | Custom User-Agent header for API requests. |
| `proxyUrl` | `string` | `undefined` | Base URL of a proxy server to relay all API requests through (e.g. to bypass CORS in browsers). See [Proxy](#-proxy) below. |
| `maxRetries` | `number` | `3` | Number of times to automatically retry failed requests (e.g. on HTTP 500 or timeout). |
| `retryDelay` | `number` | `500` | Initial delay between retries in milliseconds (uses exponential backoff). |
| `concurrency` | `number` | `3` | Maximum number of concurrent network requests allowed at once. |
| `timeout` | `number` | `15000` | Request timeout in milliseconds. |
| `storage` | `StorageAdapter` | *auto-detected* | Session and data storage adapter. |
| `passkey` | `string` | `undefined` | Key used to transparently encrypt everything saved in your storage adapter using AES-GCM. |
| `offlineQueue` | `boolean` | `false` | Enable or disable the offline mutation queue. |
| `prefetch` | `PrefetchConfig` | `undefined` | Background prefetching scheduler. |
| `cache` | `CacheConfig` | `undefined` | Custom per-module cache duration overrides. |
| `cacheMaxEntries` | `number` | `undefined` | Limit the number of entries stored in the cache. |
| `on2faRequired` | `Function` | `undefined` | Global callback to handle 2FA challenges. |
| `onCredentialsRequired` | `Function` | `undefined` | Callback to supply credentials on token refresh failure. |
| `onError` | `ErrorMiddleware` | `undefined` | Custom error interception middleware. |

---

## 🛣️ Proxy

Linkdirecte has built-in proxy support. When `proxyUrl` is set, all API requests and file downloads are routed through that URL instead of hitting EcoleDirecte directly. This is essential when running in browsers, where CORS blocks direct calls to the EcoleDirecte API.

The recommended proxy is [**Procsy**](https://github.com/Scolup/Procsy), a lightweight Cloudflare Workers proxy purpose-built for this use case. It handles CORS headers, IP spoofing, and SSRF protection out of the box.

### Setup

1. **Deploy Procsy** — follow the [Procsy README](https://github.com/Scolup/Procsy#deployment) to deploy it on Cloudflare Workers.

2. **Point Linkdirecte at your Procsy instance:**

```typescript
import { configure } from "@scolup/linkdirecte";

configure({
  proxyUrl: "https://myprocsyinstance.hithisismyname.workers.dev",
});
```

That's it. Every outgoing request will now be relayed through Procsy.

### How it works under the hood

When `proxyUrl` is configured, Linkdirecte rewrites all outgoing request URLs to point at the proxy base. It also:

- Moves the user agent from the `User-Agent` header to `X-Procsy-User-Agent`, which bypasses Chromium's 40450316 issue.
- Attaches an `X-Procsy-Base-URL` header containing the original EcoleDirecte API base URL, so the proxy knows where to forward the request.

> **Note**: When `proxyUrl` is **not** set (the default), Linkdirecte talks directly to `https://api.ecoledirecte.com/v3`. This works fine in server-side environments where CORS is not a concern.

---

## 🗄️ Storage Adapters (Auto-Detected!)

By default, Linkdirecte automatically detects and selects the best storage option for your environment:

1. **IndexedDB** — used in IndexedDB-capable runtimes (browsers, CF Workers, Deno).
2. **localStorage** — used in standard Web Storage runtimes (browsers if IndexedDB unavailable, React Native).
3. **Node Storage** — used in Node.js or Bun environments.
4. **Memory Storage** — falls back to volatile in-memory storage if nothing else is available.

You can explicitly force an adapter or supply a custom one.

### `indexedDBStorage`
Backed by IndexedDB under a database named `linkdirecte`. Perfect for standard web browsers.
```typescript
import { configure, indexedDBStorage } from "@scolup/linkdirecte";
configure({ storage: indexedDBStorage });
```

### `localStorageStorage`
Backed by the browser's `localStorage` API. Excellent for simple React Native, Capacitor, or Chrome extension usage.
```typescript
import { configure, localStorageStorage } from "@scolup/linkdirecte";
configure({ storage: localStorageStorage });
```

### `nodeStorage`
Saves your session to a local JSON file. Excellent for command-line tools or servers running in Node.js or Bun.
```typescript
import { configure, nodeStorage } from "@scolup/linkdirecte";

// Saves to './linkdirecte-session.json' by default
configure({ storage: nodeStorage() });

// Or specify a custom path:
configure({ storage: nodeStorage("/var/data/session.json") });
```

### `cloudflareKVStorage`
Wraps a Cloudflare KV namespace.
```typescript
import { configure, cloudflareKVStorage } from "@scolup/linkdirecte";

export default {
  async fetch(request, env) {
    configure({ storage: cloudflareKVStorage(env.MY_SESSION_KV) });
    // ...
  }
};
```

### `asyncStorage` (Custom Wrappers)
Allows you to wrap any asynchronous key-value storage engine. Here's how to wrap React Native's `@react-native-async-storage/async-storage`:
```typescript
import AsyncStorage from "@react-native-async-storage/async-storage";
import { configure, asyncStorage } from "@scolup/linkdirecte";

configure({
  storage: asyncStorage({
    getItem: (key) => AsyncStorage.getItem(key),
    setItem: (key, value) => AsyncStorage.setItem(key, value),
    removeItem: (key) => AsyncStorage.removeItem(key),
  }),
});
```

---

## 🔒 Transparent AES-GCM Encryption

Concerned about storing credentials on disk or in the browser? Simply provide a `passkey`!

When a `passkey` is specified, Linkdirecte will **automatically wrap** your active storage adapter with an encrypted wrapper. All session tokens, IDs, and account info will be encrypted using **AES-GCM** before writing, and decrypted on read.

```typescript
import { configure, nodeStorage } from "@scolup/linkdirecte";

configure({
  storage: nodeStorage(),
  passkey: "super-secret-password" // Encryption enabled!
});
```

---

## 📥 File Downloads

### `download`

Retrieves documents and other resources from EcoleDirecte.

```typescript
function download(options?: DownloadOptions): Promise<ArrayBuffer | Blob | ReadableStream>
```

#### Options (`DownloadOptions`)
- `as` *("buffer" | "blob" | "stream")*: The format to return. Defaults to `"buffer"`.
- `params` *(Record<string, any>)*: Extra post body parameters.

#### Example (Writing a downloaded PDF to disk in Node/Bun):
```typescript
import { download } from "@scolup/linkdirecte";
import { writeFile } from "node:fs/promises";

const fileArrayBuffer = await download({
  params: {
    forceDownload: 0,
    id: 12345,
    type: "bulletin",
  },
});

await writeFile("./report-card.pdf", Buffer.from(fileArrayBuffer));
console.log("PDF written to disk!");
```

### `downloadPhoto`

Retrieves the profile picture of the currently active account.

```typescript
function downloadPhoto(options?: { as?: "buffer" | "blob" | "stream" }): Promise<ArrayBuffer | Blob | ReadableStream | null>
```

---

## 🛟 Offline Mutation Queue

When no internet is available, you don't want actions like marking homework as completed to be lost. By enabling `offlineQueue: true` in your configuration, supported mutating requests will be recorded locally if the user is offline. The following functions are queued: `markAsDone`, `sendHomeworkComment`, `createFolder`, `deleteNodes`, `sendMessage`, and `updateSettings`.

You can synchronize them once the connection is restored:

```typescript
import { offlineQueue } from "@scolup/linkdirecte";

// Check the queue
const pendingCount = offlineQueue.getQueue().length;
console.log(`You have ${pendingCount} offline actions pending.`);

// Flush the queue to send them to EcoleDirecte
await offlineQueue.flush();
```

---

## 🧠 Background Prefetching

Prefetching warms up the SDK cache by loading module data in the background, making your app respond instantly!

```typescript
import { configure, startAutoPrefetch } from "@scolup/linkdirecte";

configure({
  prefetch: {
    enabled: true,
    interval: "15m", // Prefetch every 15 minutes (supports 's', 'm', 'h')
    modules: ["grades", "messages", "homework"]
  }
});

// Start background syncing!
startAutoPrefetch();
```

---

## 🗂️ Type Definitions

### `EdConfig`

Defines global parameters passed to `configure()`.

```typescript
interface EdConfig {
  userAgent?: string;
  proxyUrl?: string;
  maxRetries?: number;
  retryDelay?: number;
  concurrency?: number;
  timeout?: number;
  storage?: StorageAdapter;
  passkey?: string;
  offlineQueue?: boolean;
  prefetch?: PrefetchConfig;
  onError?: ErrorMiddleware;
  on2faRequired?: (
    question: string,
    choices: string[]
  ) => number | string | Promise<number | string>;
  onCredentialsRequired?: () =>
    | { identifiant: string; motdepasse: string }
    | Promise<{ identifiant: string; motdepasse: string }>;
  cache?: CacheConfig;
  cacheMaxEntries?: number;
}
```

### `PrefetchConfig`

Configures the background cache prefetching daemon.

```typescript
interface PrefetchConfig {
  enabled?: boolean;
  interval?: string | false; // e.g., "30s", "5m", "1h", or false to disable
  modules?: string[];
}
```

### `CacheConfig`

Per-module cache durations. You can configure how long items should stay cached.

```typescript
interface CacheConfig {
  grades?: string | false;
  timetable?: string | false;
  messages?: string | false;
  homework?: string | false;
  documents?: string | false;
  cloud?: string | false;
  attendance?: string | false;
  timeline?: string | false;
}
```

### `StorageAdapter`

The standard interface for defining custom data storage persistence.

```typescript
interface StorageAdapter {
  get(key: string): string | null | Promise<string | null>;
  set(key: string, value: string): void | Promise<void>;
  delete(key: string): void | Promise<void>;
}
```
