// © 2026 typeof (Scolup) | Licensed under AGPL 3.0
import { edFetch } from '../../core/fetch';

export interface DocumentEntry {
  id: number;
  libelle: string;
  idEleve: number;
  date: Date;
  type: string;
  signatureDemandee?: boolean;
  [key: string]: unknown;
}

export interface DocumentsResult {
  factures: DocumentEntry[];
  notes?: DocumentEntry[];
  viescolaire?: DocumentEntry[];
  administratifs?: DocumentEntry[];
  listesPiecesAVerser?: any;
  [key: string]: unknown;
}

export async function getDocuments(): Promise<DocumentsResult> {
  return edFetch<DocumentsResult>('/elevesDocuments.awp?verbe=get', {
    method: 'POST',
    body: {},
  });
}
