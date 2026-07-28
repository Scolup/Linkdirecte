// © 2026 typeof (Scolup) | Licensed under AGPL 3.0
import { edFetch } from '../../core/fetch';
import { requireCurrentAccount } from '../../core/request';
import { encodeBase64 } from '../../core/transform';
import {
  assertNonEmptyString,
  assertNonEmptyArray,
  assertPositiveNumber,
} from '../../core/validate';

export interface GetMessagesOptions {
  folderId?: number;
  withContent?: boolean;
}

export interface SendMessageData {
  subject: string;
  content: string;
  destinataires: unknown[];
}

export interface MessageEntry {
  id: number;
  subject: string;
  content?: string;
  fromName?: string;
  date: Date;
  read: boolean;
  answered?: boolean;
  transferred?: boolean;
  canAnswer?: boolean;
  [key: string]: unknown;
}

export interface MessagesResult {
  messages?: {
    received?: MessageEntry[];
    sent?: MessageEntry[];
    drafts?: MessageEntry[];
  };
  [key: string]: unknown;
}

export async function getMessages(options: GetMessagesOptions = {}): Promise<MessagesResult> {
  const account = requireCurrentAccount();
  const endpoint = `/eleves/${account.id}/messages.awp?verbe=get`;

  const { folderId, withContent, ...rest } = options;
  const result = await edFetch<MessagesResult>(endpoint, {
    method: 'POST',
    body: {
      anneeMessages: '',
      ...(folderId !== undefined ? { idClasseur: folderId } : {}),
    },
    ...rest,
  });

  if (options.withContent && result.messages?.received) {
    result.messages.received = await Promise.all(
      result.messages.received.map(async (msg: MessageEntry) => {
        try {
          const detail = await getMessage(msg.id);
          return { ...msg, ...detail };
        } catch {
          return msg;
        }
      }),
    );
  }

  return result;
}

export async function getMessage(id: number): Promise<MessageEntry> {
  assertPositiveNumber(id, 'message id');
  const account = requireCurrentAccount();
  const endpoint = `/eleves/${account.id}/messages/${id}.awp?verbe=get&mode=destinataire`;
  return edFetch<MessageEntry>(endpoint, {
    method: 'POST',
    body: { anneeMessages: '' },
  });
}

export async function sendMessage(data: SendMessageData): Promise<{ success: boolean }> {
  assertNonEmptyString(data.subject, 'subject');
  assertNonEmptyString(data.content, 'content');
  assertNonEmptyArray(data.destinataires, 'destinataires');

  const account = requireCurrentAccount();

  const endpoint = `/eleves/${account.id}/messages.awp?verbe=post`;
  return edFetch<{ success: boolean }>(endpoint, {
    method: 'POST',
    queued: true,
    body: {
      message: {
        subject: data.subject,
        content: encodeBase64(data.content),
        groupesDestinataires: [
          {
            destinataires: data.destinataires,
            selection: { type: 'P' },
          },
        ],
        from: { role: account.typeCompte, id: account.id, read: true },
      },
      anneeMessages: '',
    },
  });
}
