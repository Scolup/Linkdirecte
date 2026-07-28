// © 2026 typeof (Scolup) | Licensed under AGPL 3.0
import { edFetch } from '../../core/fetch';
import { requireCurrentAccount } from '../../core/request';
import type { AccountSettings } from '../../types';

export async function getSettings(): Promise<AccountSettings> {
  const account = requireCurrentAccount();
  const endpoint = `/logins/${account.idLogin}.awp?verbe=get`;
  return edFetch<AccountSettings>(endpoint, {
    method: 'POST',
    body: {},
  });
}

export async function updateSettings(data: {
  email?: string;
  portable?: string;
  questionSecrete?: string;
  reponse?: string;
  nouveauMotDePasse?: string;
  identifiant?: string;
}): Promise<AccountSettings> {
  const account = requireCurrentAccount();
  const payload: Record<string, string> = {
    identifiant: account.identifiant,
    ...data,
  };
  if (data.nouveauMotDePasse) {
    payload.confirmationMotDePasse = data.nouveauMotDePasse;
  }
  const endpoint = `/logins/${account.idLogin}.awp?verbe=put`;
  return edFetch<AccountSettings>(endpoint, {
    method: 'POST',
    queued: true,
    body: payload,
  });
}

export async function updateAccessibility(enabled: boolean): Promise<{ success: boolean }> {
  const account = requireCurrentAccount();

  return edFetch<{ success: boolean }>(`/parametreIndividuel.awp?verbe=put`, {
    method: 'POST',
    body: {
      path: `Préférences/Elèves/accessibiliteVisuelle/${account.id}`,
      value: enabled ? '1' : '0',
    },
  });
}
