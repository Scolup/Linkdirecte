// © 2026 typeof (Scolup) | Licensed under AGPL 3.0
import { edFetch } from './fetch';
import { getToken, getConfig } from './store';
import { requireCurrentAccount } from './request';

export type DownloadFormat = 'buffer' | 'blob' | 'stream';

export interface DownloadOptions {
  as?: DownloadFormat;
  params?: Record<string, unknown>;
}

export async function download(
  options: DownloadOptions = {},
): Promise<ArrayBuffer | Blob | ReadableStream> {
  const token = getToken();

  const response = await edFetch<Response>('/telechargement.awp?verbe=get', {
    method: 'POST',
    body: {
      ...options.params,
      token,
    },
    skipAuth: true,
    isDownload: true,
  });

  return formatDownloadResponse(response, options.as ?? 'buffer');
}

export async function downloadPhoto(
  options: { as?: DownloadFormat } = {},
): Promise<ArrayBuffer | Blob | ReadableStream | null> {
  const account = requireCurrentAccount();
  const photoUrl = account.profile?.photo;
  if (!photoUrl) {
    return null;
  }

  let url = photoUrl;
  if (url.startsWith('//')) {
    url = `https:${url}`;
  } else if (!url.startsWith('http')) {
    const config = getConfig();
    const baseUrl = config.proxyUrl || 'https://api.ecoledirecte.com';
    url = `${baseUrl}${url}`;
  }

  const response = await edFetch<Response>(url, {
    method: 'GET',
    skipAuth: true,
    isDownload: true,
  });

  return formatDownloadResponse(response, options.as ?? 'buffer');
}

function formatDownloadResponse(
  response: Response,
  format: DownloadFormat,
): Promise<ArrayBuffer | Blob | ReadableStream> {
  switch (format) {
    case 'blob':
      return response.blob();
    case 'stream':
      if (!response.body) {
        throw new Error('Response body is null — cannot stream');
      }
      return Promise.resolve(response.body);
    case 'buffer':
    default:
      return response.arrayBuffer();
  }
}
