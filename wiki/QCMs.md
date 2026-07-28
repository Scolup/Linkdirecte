<p align="center">
  <picture><source media="(prefers-color-scheme: light)" srcset="https://shieldcn.dev/header/glow.svg?title=QCMs&amp;subtitle=Learn+how+to+get+QCM+data+with+Linkdirecte.&amp;logo=lu%3AMailQuestion&amp;mode=light&amp;theme=blue&amp;align=left" /><img alt="QCMs | Learn how to get QCM data with Linkdirecte." src="https://shieldcn.dev/header/glow.svg?title=QCMs&amp;subtitle=Learn+how+to+get+QCM+data+with+Linkdirecte.&amp;logo=lu%3AMailQuestion&amp;mode=dark&amp;theme=blue&amp;align=left" /></picture>
</p>

The Forms/QCMs module manages online assessments, questionnaires, and multi-choice quizzes (QCMs) assigned to students by teachers.

---

## 🚀 Getting Started

Here's how to fetch assigned quizzes, inspect their structures, and respond to questions.

```typescript
import { getQcms, getQcmDetail } from "@scolup/linkdirecte";

// 1. Fetch available quizzes
const result = await getQcms();
const activeQuiz = result.associations?.[0];

if (activeQuiz) {
  console.log(`Let's work on: ${activeQuiz.titre || "Untitled Quiz"}`);

  // 2. Fetch questions for this quiz
  const details = await getQcmDetail(activeQuiz.idQcm, activeQuiz.id);

  details.questions.forEach((question, index) => {
    console.log(`Question ${index + 1}: ${question.libelle}`);
    question.choices.forEach(choice => {
      console.log(`  [ ] ID: ${choice.id} | ${choice.libelle}`);
    });
  });
} else {
  console.log("No quizzes assigned right now!");
}
```

---

## 📖 API Reference

### `getQcms`

Retrieves a list of all assigned questionnaires/QCMs.

```typescript
function getQcms(): Promise<QcmsResult>
```

---

### `getQcmDetail`

Retrieves the question set and candidate choices for a specific QCM.

```typescript
function getQcmDetail(
  idQcm: number,
  idAssociation: number,
): Promise<QcmDetailResult>
```

---

### `updateQcmStatus`

Updates the student's status on a quiz (e.g., when they start or complete it).

```typescript
function updateQcmStatus(
  idQcm: number,
  idAssociation: number,
  idParticipant: number,
  action: "updateStartDate" | "updateEndDate",
): Promise<{ success: boolean }>
```

- `idParticipant`: Participant ID returned in the QCM details.
- `action`: Use `"updateStartDate"` when the student opens/starts the test, and `"updateEndDate"` when finalizing and submitting the complete exam.

---

### `submitQcmAnswer`

Submits selected choice IDs for a single question.

```typescript
function submitQcmAnswer(
  params: {
    idQcm: number;
    idAssociation: number;
    idParticipant: number;
    idReponse: number;
    idQuestion: number;
    choiceIds: number[];
  },
): Promise<{ success: boolean }>
```

- `choiceIds`: An array of numeric choice IDs the student selected for this question.

---

## 🗂️ Type Definitions

### `QcmsResult`

```typescript
interface QcmsResult {
  associations?: QcmEntry[];
}
```

### `QcmEntry`

| Property | Type | Description |
| :--- | :--- | :--- |
| `id` | `number` | The association ID. |
| `idQcm` | `number` | The questionnaire ID. (raw key) |
| `titre` | `string` *(optional)* | Title of the test. (raw key) |
| `libelleMatiere` | `string` *(optional)* | Subject label. |
| `nomProf` | `string` *(optional)* | Teacher who assigned the QCM. |
| `date` | `Date` *(optional)* | The date when the quiz was assigned. |
| `status` | `string` *(optional)* | Quiz state (e.g. `"Not Started"`, `"In Progress"`). |

### `QcmDetailResult`

```typescript
interface QcmDetailResult {
  idQcm: number;
  questions: Array<{
    id: number;
    libelle: string; // (raw key)
    choices: Array<{ id: number; libelle: string }>; // (raw key)
  }>;
}
```
