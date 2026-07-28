// © 2026 typeof (Scolup) | Licensed under AGPL 3.0
import { edFetch } from '../../core/fetch';
import { requireCurrentAccount } from '../../core/request';

export interface AttendanceEntry {
  id: number;
  date: Date;
  type: string;
  libelleMatiere?: string;
  justifie?: boolean;
  typeJustification?: string;
  nomProf?: string;
  pointsPermis?: number;
  idEleve?: number;
  motif?: string;
  justifieEd?: boolean;
  dontNeedJustifiePrim?: boolean;
  jour?: Date;
  [key: string]: unknown;
}

export interface AttendanceResult {
  absences?: AttendanceEntry[];
  delays?: AttendanceEntry[];
  punishments?: AttendanceEntry[];
  attendance?: AttendanceEntry[];
  parametrage?: Record<string, unknown>;
  [key: string]: unknown;
}

export async function getAttendance(): Promise<AttendanceResult> {
  const account = requireCurrentAccount();
  const endpoint = `/eleves/${account.id}/viescolaire.awp?verbe=get`;
  return edFetch<AttendanceResult>(endpoint, {
    method: 'POST',
    body: {},
  });
}
