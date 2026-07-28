<p align="center">
  <picture><source media="(prefers-color-scheme: light)" srcset="https://shieldcn.dev/header/glow.svg?title=Documents&amp;subtitle=Learn+how+to+get+documents+with+Linkdirecte.&amp;logo=lu%3AFileText&amp;mode=light&amp;theme=blue&amp;align=left" /><img alt="Documents | Learn how to get documents with Linkdirecte." src="https://shieldcn.dev/header/glow.svg?title=Documents&amp;subtitle=Learn+how+to+get+documents+with+Linkdirecte.&amp;logo=lu%3AFileText&amp;mode=dark&amp;theme=blue&amp;align=left" /></picture>
</p>

The Documents module provides access to official school documents.

---

## 🚀 Getting Started

Let's retrieve the list of available school documents and see what's ready to download.

```typescript
import { getDocuments, download } from "@scolup/linkdirecte";
import { writeFile } from "node:fs/promises";

// Fetch lists of invoices, report cards, etc.
const result = await getDocuments();

// Check if any report cards are available under the "notes" document array
const latestReportCard = result.notes?.[0];

if (latestReportCard) {
  console.log(`Downloading report card: ${latestReportCard.libelle}...`);

  // To download documents, send a post request to the download endpoint using the document ID and type
  const fileData = await download({
    as: "buffer",
    params: {
      forceDownload: 0,
      id: latestReportCard.id,
      type: latestReportCard.type,
    },
  });

  // Save it locally!
  await writeFile(`./${latestReportCard.libelle}.pdf`, Buffer.from(fileData));
  console.log("Download complete!");
} else {
  console.log("No report cards available to download.");
}
```

---

## 📖 API Reference

### `getDocuments`

Fetches categorized folders of files made available to the student.

```typescript
function getDocuments(): Promise<DocumentsResult>
```

#### Returns

A promise that resolves to a `DocumentsResult` object containing document lists grouped by categories.

---

## 🗂️ Type Definitions

### `DocumentsResult`

EcoleDirecte categorizes documents into distinct buckets. This object maps each bucket:

```typescript
interface DocumentsResult {
  factures: DocumentEntry[];           // Invoices & financial documents
  notes?: DocumentEntry[];             // Quarterly report cards / transcripts (raw key)
  viescolaire?: DocumentEntry[];       // Absences, behavior, and school life reports
  administratifs?: DocumentEntry[];    // Registration files, forms, etc. (raw key)
  listesPiecesAVerser?: any;           // List of documents the school expects you to upload (raw key)
}
```

### `DocumentEntry`

Provides all the metadata you need to describe and download a specific document:

| Property | Type | Description |
| :--- | :--- | :--- |
| `id` | `number` | Unique ID of the document. |
| `libelle` | `string` | The title/label of the document (e.g., `"Bulletin du 1er Trimestre"`). |
| `date` | `Date` | The official publication date of this document. |
| `type` | `string` | Category code. |
| `idEleve` | `number` | The ID of the student associated with the document. |
| `signatureDemandee` | `boolean` *(optional)* | Whether parents or students are required to electronically sign this document. |
| `taille` | `number` *(optional)* | Size of the document file in bytes. |
| `libelleMatiere` | `string` *(optional)* | Subject label if related to a specific class. |
| `nomProf` | `string` *(optional)* | Teacher related to the document. |
