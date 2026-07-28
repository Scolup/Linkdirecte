// © 2026 typeof (Scolup) | Licensed under AGPL 3.0
import { edFetch, type FetchOptions } from '../../core/fetch';
import { requireCurrentAccount } from '../../core/request';
import type { CloudNode, CloudEntry } from '../../types';

export interface GetCloudOptions extends FetchOptions {
  depth?: number;
}

export async function getCloud(options: GetCloudOptions = {}): Promise<CloudEntry[]> {
  const account = requireCurrentAccount();
  const endpoint = `/cloud/E/${account.id}.awp?verbe=get`;
  const { depth, ...fetchOptions } = options;
  return edFetch<CloudEntry[]>(endpoint, {
    method: 'POST',
    body: { profondeur: depth || 3 },
    ...fetchOptions,
  });
}

export async function createFolder(name: string, parentNode: CloudNode): Promise<CloudNode> {
  const account = requireCurrentAccount();
  const endpoint = `/cloud/E/${account.id}.awp?verbe=post`;
  return edFetch<CloudNode>(endpoint, {
    method: 'POST',
    queued: true,
    body: { parentNode, libelle: name, typeRessource: 'folder' },
  });
}

export async function deleteNodes(nodes: CloudNode[]): Promise<{ success: boolean }> {
  const account = requireCurrentAccount();
  const endpoint = `/cloud/E/${account.id}/visibility.awp?verbe=delete`;
  return edFetch<{ success: boolean }>(endpoint, {
    method: 'POST',
    queued: true,
    body: { tabNodes: nodes },
  });
}
