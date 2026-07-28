<p align="center">
  <picture><source media="(prefers-color-scheme: light)" srcset="https://shieldcn.dev/header/glow.svg?title=Event+listening&amp;subtitle=Learn+how+to+listen+for+events+with+Linkdirecte.&amp;logo=lu%3ABell&amp;mode=light&amp;theme=blue&amp;align=left" /><img alt="Event listening | Learn how to listen for events with Linkdirecte." src="https://shieldcn.dev/header/glow.svg?title=Event+listening&amp;subtitle=Learn+how+to+listen+for+events+with+Linkdirecte.&amp;logo=lu%3ABell&amp;mode=dark&amp;theme=blue&amp;align=left" /></picture>
</p>

The Listen module provides a simple event system that lets you poll EcoleDirecte for changes and respond immediately when something new happens—like receiving a brand-new grade, a message, or a new school activity!

---

## 🚀 Getting Started

Let's set up a daemon to watch for new events in real-time.

```typescript
import { startPolling, on } from "@scolup/linkdirecte";

// 1. Listen for new grades
const unsubscribeGrades = on("newGrade", (grade) => {
  console.log(`🎉 New Grade Posted! ${grade.valeur}/${grade.noteSur} in ${grade.libelleMatiere}`);
});

// 2. Listen for new messages
on("newMessage", (message) => {
  console.log(`✉️ New Message from ${message.fromName || "Unknown"}: "${message.subject}"`);
});

// 3. Listen for new timeline entries
on("newTimelineEntry", (entry) => {
  console.log(`📅 New Activity: [${entry.typeElement}] ${entry.titre}`);
});

// 4. Listen for polling errors (useful if servers go down)
on("pollingError", (error) => {
  console.error("⚠️ An error occurred while polling:", error);
});

// 5. Start the engine! (Polls every 30 seconds)
startPolling({ interval: 30000 });
```

---

## 📖 API Reference

### `startPolling`

Spins up a background timer that regularly pulls data from EcoleDirecte, computes differences, and emits events when updates are discovered.

```typescript
function startPolling(config?: PollingConfig): void
```

If called while polling is already active, it stops the existing timer before starting a new one. The first poll fires immediately—there is no initial delay.

#### Parameters
- `config` *(optional)*:
  - `interval` *(number)*: How often the SDK should query EcoleDirecte, specified in milliseconds. Defaults to `60000` (1 minute).

---

### `stopPolling`

Shuts down the background timer and stops all polling requests.

```typescript
function stopPolling(): void
```

---

### `on`

Registers a listener function for a specific event.

```typescript
function on(event: string, handler: (data: any) => void): () => void
```

#### Parameters
- `event` *(string)*: The event name to listen for (see [Event Types Reference](#-event-types-reference)).
- `handler` *(`(data: any) => void`)*: Callback invoked with the event payload whenever the event fires.

#### Returns
An unsubscribe function. Call it to quickly remove the listener and clean up memory!

```typescript
const unsubscribe = on("newGrade", (g) => console.log(g));

// Stop listening later
unsubscribe();
```

---

### `off`

Explicitly removes a previously registered listener. You must pass the same function reference that was originally passed to `on`.

```typescript
function off(event: string, handler: (data: any) => void): void
```

#### Parameters
- `event` *(string)*: The event name the handler was registered under.
- `handler` *(`(data: any) => void`)*: The exact function reference originally passed to `on`.

```typescript
const handler = (grade) => console.log(grade);
on("newGrade", handler);

// Remove later — same reference required
off("newGrade", handler);
```

> **Tip:** Prefer the unsubscribe function returned by `on` when you only need to remove a single listener. Use `off` when you need to remove a listener without holding onto the unsubscribe closure.

---

## 🗂️ Event Types Reference

Linkdirecte processes changes across multiple student channels. You can subscribe to these events:

| Event | Emitted When | Payload Type |
| :--- | :--- | :--- |
| `"newGrade"` | A new grade is entered into the system. | `GradeEntry` |
| `"newMessage"` | A new message is received in the student's mailbox. | `MessageEntry` |
| `"newTimelineEntry"` | A new event occurs on the student's activity feed. | `TimelineEntry` |
| `"pollingError"` | An API fetch fails due to credentials, token expiry, or a network timeout. | `Error` |
