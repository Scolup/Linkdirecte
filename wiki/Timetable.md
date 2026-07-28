<p align="center">
  <picture><source media="(prefers-color-scheme: light)" srcset="https://shieldcn.dev/header/glow.svg?title=Timetable&amp;subtitle=Learn+how+to+get+the+timetable+with+Linkdirecte.&amp;logo=lu%3ACalendar&amp;mode=light&amp;theme=blue&amp;align=left" /><img alt="Timetable | Learn how to get the timetable with Linkdirecte." src="https://shieldcn.dev/header/glow.svg?title=Timetable&amp;subtitle=Learn+how+to+get+the+timetable+with+Linkdirecte.&amp;logo=lu%3ACalendar&amp;mode=dark&amp;theme=blue&amp;align=left" /></picture>
</p>

The Timetable module fetches, parses, and normalizes the student's calendar. It also allows you to retrieve a subscription URL for external calendar systems (Apple Calendar, Google Calendar, Outlook, etc.).

---

## 🚀 Getting Started

Let's fetch the student's timetable classes for the upcoming week:

```typescript
import { getTimetable } from "@scolup/linkdirecte";

const schedule = await getTimetable({
  startDate: new Date(), // Start today
  endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Next 7 days
});

console.log(`Loaded ${schedule.timetable.length} timetable events.`);

schedule.timetable.forEach(classSession => {
  const status = classSession.isAnnule ? "❌ CANCELLED" : "✅ ACTIVE";
  console.log(`\n[${status}] Subject: ${classSession.matiere}`);
  console.log(`  Time: ${classSession.start_date.toLocaleTimeString()} - ${classSession.end_date.toLocaleTimeString()}`);
  console.log(`  Room: ${classSession.salle || "No room assigned"}`);
  console.log(`  Teacher: ${classSession.prof || "Unspecified teacher"}`);
});
```

Let's fetch an iCal subscription link:

```typescript
import { getTimetableIcalUrl } from "@scolup/linkdirecte";

const calendarUrl = await getTimetableIcalUrl();
console.log("Add this link to your Google or Apple Calendar subscription feed:");
console.log(calendarUrl);
```

---

## 📖 API Reference

### `getTimetable`

Retrieves a chronologically ordered array of scheduled class sessions.

```typescript
function getTimetable(options?: {
  startDate?: string | Date;
  endDate?: string | Date;
}): Promise<TimetableResult>
```

#### Parameters

- `options` *(optional)*:
  - `startDate` *(string | Date)*: The beginning of the timetable window. Can be a standard JavaScript `Date` object or an ISO-style date string (`"YYYY-MM-DD"`). Defaults to today.
  - `endDate` *(string | Date)*: The end of the timetable window. Defaults to the same value as `startDate`.

---

### `getTimetableIcalUrl`

Retrieves the URL for the student's timetable in iCal format for integration with external calendar systems.

```typescript
function getTimetableIcalUrl(): Promise<string>
```

---

## 🗂️ Type Definitions

### `TimetableResult`

```typescript
interface TimetableResult {
  timetable: TimetableEntry[];
}
```

### `TimetableEntry`

The properties of `TimetableEntry` are returned as raw EcoleDirecte API keys (no translation is performed by the SDK):

| Property | Type | Description |
| :--- | :--- | :--- |
| `id` | `number` | Unique ID of the schedule slot. |
| `codeMatiere` | `string` | Short identifying code of the subject. |
| `matiere` | `string` | Full display name of the subject (e.g. `"Mathématiques"`). (raw key) |
| `start_date` | `Date` | Start date and time of the class. (raw key) |
| `end_date` | `Date` | End date and time of the class. (raw key) |
| `prof` | `string` *(optional)* | Name of the teacher hosting this class session. (raw key) |
| `salle` | `string` *(optional)* | Classroom label or number. (raw key) |
| `groupe` | `string` *(optional)* | Specific classroom group assigned. (raw key) |
| `isAnnule` | `boolean` *(optional)* | `true` if the session has been cancelled. (raw key) |
| `color` | `string` *(optional)* | Calendar color hex code (provided by the school's workspace). |
