<p align="center">
  <picture><source media="(prefers-color-scheme: light)" srcset="https://shieldcn.dev/header/glow.svg?title=Attendance&amp;subtitle=Learn+how+to+get+attendance+data+with+Linkdirecte.&amp;logo=lu%3AUser&amp;mode=light&amp;theme=blue&amp;align=left" /><img alt="Attendance | Learn how to get attendance data with Linkdirecte." src="https://shieldcn.dev/header/glow.svg?title=Attendance&amp;subtitle=Learn+how+to+get+attendance+data+with+Linkdirecte.&amp;logo=lu%3AUser&amp;mode=dark&amp;theme=blue&amp;align=left" /></picture>
</p>

The attendance module makes it super easy to check on a student's absences, delays, and any disciplinary events (like punishments) in EcoleDirecte.

## 🚀 Getting Started

To fetch attendance, you'll use the `getAttendance` function.

```typescript
import { getAttendance } from "@scolup/linkdirecte";

const data = await getAttendance();

if (data.absences && data.absences.length > 0) {
  console.log(`Oh! You have ${data.absences.length} registered absence(s).`);
  data.absences.forEach(absence => {
    console.log(`- Date: ${absence.date.toLocaleDateString()} | Reason: ${absence.motif || "No reason specified"}`);
  });
} else {
  console.log("Hooray! No absences recorded.");
}
```

---

## 📖 API Reference

### `getAttendance`

Fetches the student's full attendance history, including delays and punishments.

```typescript
function getAttendance(): Promise<AttendanceResult>
```

#### Returns

A promise that resolves to an `AttendanceResult` object.

---

## 🗂️ Type Definitions

### `AttendanceResult`

```typescript
interface AttendanceResult {
  absences?: AttendanceEntry[];
  delays?: AttendanceEntry[];
  punishments?: AttendanceEntry[];
  attendance?: AttendanceEntry[];
  parametrage?: Record<string, unknown>;
}
```

### `AttendanceEntry`

| Property | Type | Description |
| :--- | :--- | :--- |
| `id` | `number` | Unique ID of the attendance event. |
| `date` | `Date` | The date of the event. |
| `type` | `string` | The type code of the event. |
| `libelleMatiere` | `string` *(optional)* | Subject related to the event. |
| `justifie` | `boolean` *(optional)* | Whether the event is marked as justified. |
| `typeJustification` | `string` *(optional)* | Type category of justification. |
| `nomProf` | `string` *(optional)* | Teacher related to the event. |
| `pointsPermis` | `number` *(optional)* | Demerit points associated. |
| `idEleve` | `number` *(optional)* | Student ID. |
| `motif` | `string` *(optional)* | The reason or motif. |
| `justifieEd` | `boolean` *(optional)* | EcoleDirecte justified status flag. |
| `dontNeedJustifiePrim` | `boolean` *(optional)* | Primary education flag. |
| `jour` | `Date` *(optional)* | Exact day. |
