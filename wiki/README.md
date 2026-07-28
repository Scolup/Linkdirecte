<p align="center">
  <picture><source media="(prefers-color-scheme: light)" srcset="https://shieldcn.dev/header/glow.svg?title=Docs&amp;subtitle=Learn+how+to+use+Linkdirecte.&amp;logo=lu%3ABook&amp;mode=light&amp;theme=blue&amp;align=left" /><img alt="Docs | Learn how to use Linkdirecte." src="https://shieldcn.dev/header/glow.svg?title=Docs&amp;subtitle=Learn+how+to+use+Linkdirecte.&amp;logo=lu%3ABook&amp;mode=dark&amp;theme=blue&amp;align=left" /></picture>
</p>

Welcome to the guide for **Linkdirecte**! Linkdirecte is _the best_ SDK for interacting with EcoleDirecte _(approved and used by Scolup!)_.

---

## 📖 Table of Contents

### Getting Started
- [🔑 Authentication](Authentication.md) | Learn how to log in, handle 2FA, and manage active sessions.
- [⚙️ Configuration](Configuration.md) | Adjust network behaviors, set up persistent storage, proxy configuration, handle downloads, and configure encryption passkeys.
- [⚠️ Errors & Exception Handling](Errors.md) | Understand the error hierarchy, caught exceptions, serialization, and friendly API code mappings.

### Academic Modules
- [🎓 Grades](Grades.md) | Retrieve student grades, competencies, subjects and periods.
- [📅 Timetable](Timetable.md) | Fetch schedules.
- [📚 Homework](Homework.md) | Browse homework, get session content, and mark homework as done.

### Communication & School Life
- [✉️ Messages](Messages.md) | Get and write messages.
- [🎒 Attendance](Attendance.md) | Track absences, late arrivals, and school punishments.
- [📅 Timeline & post-its](Timeline.md) | Get the latest events and post-its.

### Additional Modules
- [☁️ Cloud](Cloud.md) | Work with the cloud space, manage folders, or delete files.
- [📄 Documents](Documents.md) | Download administrative docs, invoices, and trimester reports.
- [📝 QCMs](QCMs.md) | Fetch assigned quizzes, inspect questions, and submit response choices.
- [🔔 Event listening](Event%20listen.md) | Hook up real-time event listeners for grades, messages, or activities.

> [!NOTE]
> We won't document responses here, but you can check out [Docsdirecte](https://docsdirecte.scolup.qzz.io) ([for LLMs here](https://docsdirecte.scolup.qzz.io/llms.md)) for a full doc of EcoleDirecte's responses. _Note that dates are normalized by the SDK and you don't have to handle Base64 encoding/decoding._

---

## 🚀 Installation

Linkdirecte works natively across almost all modern runtimes and environments with **zero extra configuration**.

To install Linkdirecte in your project, choose your preferred package manager:

### Using npm (included in Node.js)
```bash
npm install @scolup/linkdirecte
```

### Using Bun
```bash
bun add @scolup/linkdirecte
```

### Using Deno
```bash
deno add npm:@scolup/linkdirecte
```

### Using Yarn
```bash
yarn add @scolup/linkdirecte
```

---

## ⚡ Runtime Support & Compatibility

| Environment | Supported | Notes |
| :--- | :--- | :--- |
| **Node.js (v18+)** | ✅ Yes | Full support. |
| **Bun** | ✅ Yes | Full support. Native speed-up! |
| **Deno** | ✅ Yes | Full support. |
| **Browsers** | ✅ Yes | Full support. Default storage : IndexedDB |
| **React Native / Expo** | ✅ Yes | Fully compatible. Storage can be bound to AsyncStorage. |
| **Cloudflare Workers / Vercel Edge** | ✅ Yes | Fully compatible. |
| **Capacitor / Electron** | ✅ Yes | Full support. |

> **Note on Timer-Based Features**: Background processes like automated token keepalives, polling loops, or cache prefetching rely on intervals. In serverless environments that lack continuous timers (e.g., short-lived Cloudflare Workers or Vercel Edge runs), these processes will quietly no-op. All regular API requests, custom cache expirations, and active session refreshes work identically everywhere!

---

## ⚡ Quick Start Example

Here is a super simple script to log in, handle security questions if required, and fetch academic grades:

```typescript
import { login, getGrades } from "@scolup/linkdirecte";

// 1. Log in. Linkdirecte will handle authentication flow under the hood!
const session = await login("your_username", "your_password");

// 2. If 2FA is needed, respond easily
if ("question" in session) {
  console.log(`EcoleDirecte asks: "${session.question}"`);
  console.log("Choices are:", session.choices);

  // Submit the string value (or index number) of the correct choice:
  await session.answer("Cereal before milk");
}

// 3. You are now logged in and verified. Fetch grades instantly!
const gradesInfo = await getGrades();
console.log(`Loaded ${gradesInfo.notes.length} grades!`);
```
