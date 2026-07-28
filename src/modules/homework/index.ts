// © 2026 typeof (Scolup) | Licensed under AGPL 3.0
import { edFetch, type FetchOptions } from '../../core/fetch';
import { postOptions, requireCurrentAccount } from '../../core/request';
import { encodeBase64 } from '../../core/transform';
import { EdApiError } from '../../core/errors';
import {
  assertNonEmptyArray,
  assertNonEmptyString,
  assertPositiveNumber,
} from '../../core/validate';
import dayjs from 'dayjs';

export interface HomeworkEntry {
  idDevoir: number;
  codeMatiere: string;
  matiere: string;
  nomProf?: string;
  donneLe: Date;
  forDate: Date;
  effectue: boolean;
  rendreEnLigne?: boolean;
  [key: string]: unknown;
}

export interface HomeworkResult {
  [date: string]: HomeworkEntry[];
}

export interface GetHomeworkOptions extends FetchOptions {
  withContent?: boolean;
}

export async function getHomework(options: GetHomeworkOptions = {}): Promise<HomeworkResult> {
  const { withContent, ...fetchOptions } = options;
  const account = requireCurrentAccount();
  const result = await edFetch<HomeworkResult>(
    `/Eleves/${account.id}/cahierdetexte.awp?verbe=get`,
    postOptions({}, fetchOptions),
  );

  if (withContent) {
    await Promise.all(
      Object.keys(result).map(async (date) => {
        const detail = (await getHomeworkForDate(date)) as any;
        result[date] = detail.matieres || detail.subjects || detail;
      }),
    );
  }

  return result;
}

export async function getHomeworkForDate(date: string | Date): Promise<HomeworkEntry[]> {
  const account = requireCurrentAccount();
  const formattedDate = dayjs(date).format('YYYY-MM-DD');
  if (formattedDate === 'Invalid Date') {
    throw new EdApiError(`Invalid date parameter: ${JSON.stringify(date)}`, 'INVALID_ARGUMENT');
  }
  return edFetch<any>(`/Eleves/${account.id}/cahierdetexte/${formattedDate}.awp?verbe=get`, {
    method: 'POST',
    body: {},
  });
}

export interface MarkAsDoneResult {
  success: boolean;
  [key: string]: unknown;
}

export async function markAsDone(homeworkIds: number[]): Promise<MarkAsDoneResult> {
  assertNonEmptyArray(homeworkIds, 'homeworkIds');
  const account = requireCurrentAccount();
  return edFetch<MarkAsDoneResult>(`/Eleves/${account.id}/cahierdetexte.awp?verbe=put`, {
    method: 'POST',
    queued: true,
    body: {
      idDevoirsEffectues: homeworkIds,
      idDevoirsNonEffectues: [],
    },
  });
}

export async function sendHomeworkComment(
  idContenu: number,
  message: string,
): Promise<{ id: number }> {
  assertPositiveNumber(idContenu, 'idContenu');
  assertNonEmptyString(message, 'message');
  const account = requireCurrentAccount();
  const endpoint = `/eleves/${account.id}/afaire/commentaires.awp?verbe=post`;
  return edFetch<{ id: number }>(endpoint, {
    method: 'POST',
    queued: true,
    body: {
      idContenu,
      message: encodeBase64(message),
    },
  });
}
