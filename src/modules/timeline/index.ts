// © 2026 typeof (Scolup) | Licensed under AGPL 3.0
import { edFetch } from '../../core/fetch';
import { requireCurrentAccount } from '../../core/request';

export interface TimelineEntry {
  id: number;
  typeElement: string;
  titre?: string;
  soustitre?: string;
  contenu?: string;
  date: Date;
  [key: string]: unknown;
}

export async function getTimeline(): Promise<TimelineEntry[]> {
  const account = requireCurrentAccount();
  const endpoint = `/eleves/${account.id}/timeline.awp?verbe=get`;
  return edFetch<TimelineEntry[]>(endpoint, {
    method: 'POST',
    body: {},
  });
}

export async function getCommonTimeline(): Promise<any> {
  const account = requireCurrentAccount();
  const endpoint = `/E/${account.id}/timelineAccueilCommun.awp?verbe=get`;
  return edFetch<any>(endpoint, {
    method: 'POST',
    body: {},
  });
}

export * from './correlator';
