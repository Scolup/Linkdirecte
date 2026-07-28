// © 2026 typeof (Scolup) | Licensed under AGPL 3.0
import { edFetch } from '../../core/fetch';
import { requireCurrentAccount } from '../../core/request';
import dayjs from 'dayjs';

export interface TimetableEntry {
  id: number;
  codeMatiere: string;
  matiere: string;
  prof?: string;
  salle?: string;
  groupe?: string;
  start_date: Date;
  end_date: Date;
  isAnnule?: boolean;
  color?: string;
  [key: string]: unknown;
}

export interface TimetableResult {
  timetable: TimetableEntry[];
  [key: string]: unknown;
}

export async function getTimetable(
  options: {
    startDate?: string | Date;
    endDate?: string | Date;
  } = {},
): Promise<TimetableResult> {
  const account = requireCurrentAccount();
  const start = dayjs(options.startDate || new Date()).format('YYYY-MM-DD');
  const end = dayjs(options.endDate || options.startDate || new Date()).format('YYYY-MM-DD');

  const endpoint = `/E/${account.id}/emploidutemps.awp?verbe=get`;
  return edFetch<TimetableResult>(endpoint, {
    method: 'POST',
    body: {
      dateDebut: start,
      dateFin: end,
      avecTrous: false,
    },
  });
}

export async function getTimetableIcalUrl(): Promise<string> {
  const account = requireCurrentAccount();
  const endpoint = `/ical/E/${account.id}/url.awp?verbe=get`;

  const result = await edFetch<{ url: string }>(endpoint, {
    method: 'POST',
    body: {},
  });
  return `https://api.ecoledirecte.com/v3/${result.url}`;
}
