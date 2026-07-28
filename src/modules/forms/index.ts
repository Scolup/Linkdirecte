// © 2026 typeof (Scolup) | Licensed under AGPL 3.0
import { edFetch } from '../../core/fetch';
import { requireCurrentAccount } from '../../core/request';

export interface QcmEntry {
  id: number;
  idQcm: number;
  libelleMatiere?: string;
  titre?: string;
  nomProf?: string;
  date?: Date;
  status?: string;
  [key: string]: unknown;
}

export interface QcmsResult {
  associations?: QcmEntry[];
  [key: string]: unknown;
}

export async function getQcms(): Promise<QcmsResult> {
  const account = requireCurrentAccount();
  const endpoint = `/eleves/${account.id}/qcms/0/associations.awp?verbe=get`;
  return edFetch<QcmsResult>(endpoint, {
    method: 'POST',
    body: {},
  });
}

export interface QcmDetailResult {
  idQcm: number;
  questions: Array<{
    id: number;
    libelle: string;
    choices: Array<{ id: number; libelle: string }>;
  }>;
  [key: string]: unknown;
}

export async function getQcmDetail(idQcm: number, idAssociation: number): Promise<QcmDetailResult> {
  const account = requireCurrentAccount();
  const endpoint = `/eleves/${account.id}/qcms/${idQcm}/associations/${idAssociation}.awp?verbe=get`;
  return edFetch<QcmDetailResult>(endpoint, {
    method: 'POST',
    body: { anneeQCMs: '' },
  });
}

export async function updateQcmStatus(
  idQcm: number,
  idAssociation: number,
  idParticipant: number,
  action: 'updateStartDate' | 'updateEndDate',
): Promise<{ success: boolean }> {
  const account = requireCurrentAccount();
  const endpoint = `/eleves/${account.id}/qcms/${idQcm}/associations/${idAssociation}/participants/${idParticipant}.awp?verbe=patch`;
  return edFetch<{ success: boolean }>(endpoint, {
    method: 'POST',
    body: { action },
  });
}

export async function submitQcmAnswer(params: {
  idQcm: number;
  idAssociation: number;
  idParticipant: number;
  idReponse: number;
  idQuestion: number;
  choiceIds: number[];
}): Promise<{ success: boolean }> {
  const account = requireCurrentAccount();
  const endpoint = `/eleves/${account.id}/qcms/${params.idQcm}/associations/${params.idAssociation}/participants/${params.idParticipant}/reponse/${params.idReponse}.awp?verbe=patch`;
  return edFetch<{ success: boolean }>(endpoint, {
    method: 'POST',
    body: {
      reponse: {
        id: params.idReponse,
        idQuestion: params.idQuestion,
        idParticipant: params.idParticipant,
        choix: params.choiceIds,
      },
    },
  });
}
