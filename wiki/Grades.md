<p align="center">
  <picture><source media="(prefers-color-scheme: light)" srcset="https://shieldcn.dev/header/glow.svg?title=Grades&amp;subtitle=Learn+how+to+get+grades+data+with+Linkdirecte.&amp;logo=lu%3AGraduationCap&amp;mode=light&amp;theme=blue&amp;align=left" /><img alt="Grades | Learn how to get grades data with Linkdirecte." src="https://shieldcn.dev/header/glow.svg?title=Grades&amp;subtitle=Learn+how+to+get+grades+data+with+Linkdirecte.&amp;logo=lu%3AGraduationCap&amp;mode=dark&amp;theme=blue&amp;align=left" /></picture>
</p>

The Grades module provides access to a student's grades, averages, and subject performance metrics. It retrieves the data directly from EcoleDirecte, returning the raw structured grade entries and term/period details.

---

## 🚀 Getting Started

Here's how to fetch your latest grades and output them grouped by subject:

```typescript
import { getGrades } from "@scolup/linkdirecte";

const result = await getGrades();

console.log(`Successfully loaded ${result.notes.length} grades!`);

// Group grades by subject manually using raw keys
const gradesBySubject = new Map<string, typeof result.notes>();
for (const grade of result.notes) {
  const list = gradesBySubject.get(grade.libelleMatiere) || [];
  list.push(grade);
  gradesBySubject.set(grade.libelleMatiere, list);
}

gradesBySubject.forEach((grades, subjectName) => {
  console.log(`--- ${subjectName} ---`);
  grades.forEach(grade => {
    console.log(`  • ${grade.valeur}/${grade.noteSur} (Coeff: ${grade.coef})`);
  });
});
```

---

## 📖 API Reference

### `getGrades`

Fetches grades and statistics for either the current school period or a specific year.

```typescript
function getGrades(options?: {
  periodId?: string;
}): Promise<GradesResult>
```

#### Parameters

- `options` *(optional)*:
  - `periodId` *(string)*: Focuses the query on a specific school term or period (e.g. `"A001"`). If not specified, returns grades across all available periods for the current year.

#### Returns

A promise that resolves to a `GradesResult` object.

---

## 🗂️ Type Definitions

### `GradesResult`

```typescript
interface GradesResult {
  notes: GradeEntry[];               // Flat list of every single grade
  periodes?: Array<{                 // List of semesters or terms found
    idPeriode: string;
    codePeriode: string;
    periode: string;
    annuel: boolean;
  }>;
}
```

### `GradeEntry`

| Property | Type | Description |
| :--- | :--- | :--- |
| `valeur` | `string` | The grade value (e.g. `"18.5"`, or `"Abs"` for absent). |
| `noteSur` | `string` | The scale of the grade (e.g. `"20"`). |
| `coef` | `string` | Weight of this grade in overall averages. |
| `enLettre` | `boolean` | `true` if this grade is marked with a letter grade (like A, B, C) instead of a number. |
| `date` | `Date` | The date when the test/assignment was taken. |
| `codeMatiere` | `string` | Unique code of the subject. |
| `libelleMatiere` | `string` | The title of the subject (e.g., `"Mathématiques"`). |
| `codePeriode` | `string` | The term/period code this grade belongs to. |
| `dateSaisie` | `Date` | The exact day the grade was posted online. |
| `commentaire` | `string` *(optional)* | Teacher comments regarding the grade. |
| `typeDevoir` | `string` *(optional)* | Type category of the exam. |
| `codeSousMatiere` | `string` *(optional)* | Sub-category code. |
| `libelleSousMatiere` | `string` *(optional)* | Sub-category label. |
