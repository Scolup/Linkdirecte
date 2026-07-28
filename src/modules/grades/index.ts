// © 2026 typeof (Scolup) | Licensed under AGPL 3.0
import { edFetch } from '../../core/fetch';
import { requireCurrentAccount } from '../../core/request';

export interface GradeEntry {
  valeur: string;
  noteSur: string;
  coef: string;
  enLettre: boolean;
  date: Date;
  codeMatiere: string;
  libelleMatiere: string;
  codePeriode: string;
  dateSaisie: Date;
  commentaire?: string;
  typeDevoir?: string;
  codeSousMatiere?: string;
  libelleSousMatiere?: string;
  [key: string]: unknown;
}

export interface SubjectEntry {
  codeMatiere: string;
  libelleMatiere: string;
  coef: number;
  nomProf?: string;
  notes: GradeEntry[];
  moyenne?: string;
  moyenneClasse?: string;
  [key: string]: unknown;
}

export interface GradesResult {
  notes: GradeEntry[];
  periodes?: Array<{
    idPeriode: string;
    codePeriode: string;
    periode: string;
    annuel: boolean;
  }>;
  [key: string]: unknown;
}

export async function getGrades(options: { periodId?: string } = {}): Promise<GradesResult> {
  const account = requireCurrentAccount();
  const endpoint = `/eleves/${account.id}/notes.awp?verbe=get`;
  return edFetch<GradesResult>(endpoint, {
    method: 'POST',
    body: { anneeScolaire: options.periodId || '' },
  });
}
