<p align="center">
  <picture><source media="(prefers-color-scheme: light)" srcset="https://shieldcn.dev/header/glow.svg?title=Homework+%26+session+content&amp;subtitle=Learn+how+to+get+homework+and+session+content+with+Linkdirecte.&amp;logo=lu%3ANotebook&amp;mode=light&amp;theme=blue&amp;align=left" /><img alt="Homework &amp; Session content | Learn how to get homework and session content with Linkdirecte." src="https://shieldcn.dev/header/glow.svg?title=Homework+%26+session+content&amp;subtitle=Learn+how+to+get+homework+and+session+content+with+Linkdirecte.&amp;logo=lu%3ANotebook&amp;mode=dark&amp;theme=blue&amp;align=left" /></picture>
</p>

The Homework module gives you access to the student's textbook. It allows you to fetch homework, session content, and mark tasks as done (even when offline!).

---

## 🚀 Getting Started

Let's read all assignments scheduled for the coming days:

```typescript
import { getHomework } from "@scolup/linkdirecte";

// Retrieve homework. Use withContent: true to automatically load the details for each task
const calendar = await getHomework({ withContent: true });

for (const [date, assignments] of Object.entries(calendar)) {
  console.log(`\n📅 Assignments for ${date}:`);

  assignments.forEach(task => {
    const status = task.effectue ? "✅ DONE" : "❌ TO DO";
    console.log(`- [${status}] [${task.matiere}] ${task.aFaire?.contenu}`);
  });
}
```

---

## 📖 API Reference

### `getHomework`

Fetches a calendar index of homework due over the next few weeks.

```typescript
function getHomework(options?: {
  withContent?: boolean;
}): Promise<HomeworkResult>
```

#### Parameters

- `options` *(optional)*:
  - `withContent` *(boolean)*: If set to `true`, the SDK will make background queries to resolve detailed HTML descriptions and attachments for each date. Defaults to `false`.

#### Returns

A promise resolving to a `HomeworkResult` map where keys are date strings (`"YYYY-MM-DD"`) and values are arrays of `HomeworkEntry`.

---

### `getHomeworkForDate`

Loads detailed descriptions and resources for a specific day.

```typescript
function getHomeworkForDate(
  date: string | Date,
): Promise<HomeworkEntry[]>
```

#### Example

```typescript
import { getHomeworkForDate } from "@scolup/linkdirecte";

const assignments = await getHomeworkForDate("2025-09-15");
assignments.forEach(task => {
  console.log(`Teacher: ${task.nomProf ?? "Unknown"}`);
  console.log(`Content (HTML): ${task.aFaire?.contenu}`);
});
```

---

### `markAsDone`

Updates the state of one or more homework assignments to completed.

```typescript
function markAsDone(
  homeworkIds: number[],
): Promise<MarkAsDoneResult>
```

---

### `sendHomeworkComment`

Post a comment under a homework assignment or a session content.

```typescript
function sendHomeworkComment(
  idContenu: number,
  message: string,
): Promise<{ id: number }>
```

#### Example

```typescript
import { sendHomeworkComment } from "@scolup/linkdirecte";

const result = await sendHomeworkComment(55442, "Here is my comment on the homework");
console.log(`Comment posted successfully with ID: ${result.id}`);
```

---

## 🗂️ Type Definitions

### `HomeworkResult`

```typescript
interface HomeworkResult {
  [dateString: string]: HomeworkEntry[]; // Date keys are formatted as YYYY-MM-DD
}
```

### `HomeworkEntry`

| Property | Type | Description |
| :--- | :--- | :--- |
| `idDevoir` | `number` | Unique identifier for the assignment. |
| `codeMatiere` | `string` | Code identifier of the subject. |
| `matiere` | `string` | Readable subject name. |
| `nomProf` | `string` *(optional)* | Name of the teacher who assigned the work. |
| `donneLe` | `Date` | The date the homework was originally assigned. |
| `forDate` | `Date` | The date when the homework is due. |
| `effectue` | `boolean` | Indicates if marked by the student as complete. |
| `rendreEnLigne` | `boolean` *(optional)* | Indicates if the assignment must be submitted digitally. |

### `MarkAsDoneResult`

```typescript
interface MarkAsDoneResult {
  success: boolean;
}
```
