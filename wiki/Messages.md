<p align="center">
  <picture><source media="(prefers-color-scheme: light)" srcset="https://shieldcn.dev/header/glow.svg?title=Messages&amp;subtitle=Learn+how+to+interact+with+mail+with+Linkdirecte.&amp;logo=lu%3AMessagesSquare&amp;mode=light&amp;theme=blue&amp;align=left" /><img alt="Messages | Learn how to interact with mail with Linkdirecte." src="https://shieldcn.dev/header/glow.svg?title=Messages&amp;subtitle=Learn+how+to+interact+with+mail+with+Linkdirecte.&amp;logo=lu%3AMessagesSquare&amp;mode=dark&amp;theme=blue&amp;align=left" /></picture>
</p>

The Messages module connects you directly to the school's communication channels. It handles reading received mail, viewing attachments, sending replies, and organizing drafts.

---

## 🚀 Getting Started

Let's fetch the list of received messages and read the most recent unread email.

```typescript
import { getMessages, getMessage } from "@scolup/linkdirecte";

// Fetch the inbox
const inbox = await getMessages();
const unreadEmails = inbox.messages?.received?.filter(msg => !msg.read) ?? [];

console.log(`You have ${unreadEmails.length} unread message(s).`);

if (unreadEmails.length > 0) {
  const firstUnread = unreadEmails[0];
  console.log(`Reading: "${firstUnread.subject}" from ${firstUnread.fromName}...`);

  // Load full content (EcoleDirecte handles base64-decoded HTML automatically inside the SDK!)
  const fullDetail = await getMessage(firstUnread.id);
  console.log("\nMessage body:");
  console.log(fullDetail.content);
}
```

---

## 📖 API Reference

### `getMessages`

Retrieves a directory of messages.

```typescript
function getMessages(options?: GetMessagesOptions): Promise<MessagesResult>
```

#### Parameters

- `options` *(optional)*:
  - `folderId` *(number)*: Pass a folder ID to retrieve messages from custom archives or folders.
  - `withContent` *(boolean)*: If set to `true`, automatically makes individual parallel queries to retrieve the content bodies for all returned messages. Defaults to `false`.
  - `year` *(string)*: Restrict messages to a school year range in the `AAAA-AAAA` format (e.g. `2023-2024`). If the format is invalid or omitted, the default empty value is used.

---

### `getMessage`

Loads the detailed envelope and content body for a single message.

```typescript
function getMessage(
  id: number,
  options?: GetMessageOptions,
): Promise<MessageEntry>
```

#### Parameters

- `id` *(number)*: The unique ID of the message to retrieve.
- `options` *(optional)*:
  - `year` *(string)*: Restrict the message to a school year range in the `AAAA-AAAA` format (e.g. `2023-2024`). If the format is invalid or omitted, the default empty value is used.

> **Note**: Opening a message with `getMessage` automatically marks it as **read** on EcoleDirecte's servers.

---

### `sendMessage`

Composes and sends a new message.

```typescript
function sendMessage(
  data: SendMessageData,
): Promise<{ success: boolean }>
```

#### Example

```typescript
import { sendMessage } from "@scolup/linkdirecte";

const result = await sendMessage({
  subject: "Absence Excuse",
  content: "Hello, this is to inform you that...",
  destinataires: [
    { id: 98765, type: "P" } // Target recipient object
  ]
});

if (result.success) {
  console.log("Message sent successfully!");
}
```

---

## 🗂️ Type Definitions

### `MessagesResult`

```typescript
interface MessagesResult {
  messages?: {
    received?: MessageEntry[];
    sent?: MessageEntry[];
    drafts?: MessageEntry[];
  };
}
```

### `MessageEntry`

| Property | Type | Description |
| :--- | :--- | :--- |
| `id` | `number` | Unique ID of the message. |
| `subject` | `string` | Subject header of the email. |
| `date` | `Date` | Date and time the email was received/sent. |
| `read` | `boolean` | `true` if the message has been read. |
| `content` | `string` *(optional)* | Fully decoded HTML or text of the message body (available when fetching via `getMessage` or `withContent: true`). |
| `fromName` | `string` *(optional)* | Readable name of the sender. |
| `answered` | `boolean` *(optional)* | `true` if this message has already been replied to. |
| `transferred` | `boolean` *(optional)* | `true` if the message was forwarded. |
| `canAnswer` | `boolean` *(optional)* | Whether replies are permitted for this message. |

### `SendMessageData`

```typescript
interface SendMessageData {
  subject: string;
  content: string;
  destinataires: Array<{
    id: number;
    type: string; // e.g. "P" (Teacher), "E" (Student)
    [key: string]: any;
  }>;
}
```
