// © 2026 typeof (Scolup) | Licensed under AGPL 3.0
import dayjs from 'dayjs';

export function decodeBase64(value: string): string {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder('utf-8').decode(bytes);
}

export function safeDecodeBase64(value: string): string {
  if (typeof value !== 'string' || value.trim() === '' || value.length < 4 || /\s/.test(value)) {
    return value;
  }
  try {
    const decoded = decodeBase64(value);
    if (decoded.includes('\uFFFD')) {
      return value;
    }
    return decoded;
  } catch {
    return value;
  }
}

export function decodeBase64Content(value: string): string {
  return safeDecodeBase64(value);
}

export function encodeBase64(value: string): string {
  return btoa(unescape(encodeURIComponent(value)));
}

function isDateString(value: any): boolean {
  if (typeof value !== 'string') return false;
  return /^\d{4}-\d{2}-\d{2}(\s|T)?(\d{2}:\d{2}(:\d{2})?)?$/.test(value);
}

function convertDate(value: string): Date | string {
  const d = dayjs(value);
  return d.isValid() ? d.toDate() : value;
}

export function transform(data: any): any {
  if (data === null || data === undefined) return data;

  if (Array.isArray(data)) {
    return data.map(transform);
  }

  if (typeof data === 'object') {
    if (data instanceof Date) return data;

    const result: any = {};
    for (const key in data) {
      let value = data[key];

      if (isDateString(value)) {
        value = convertDate(value);
      } else if (typeof value === 'string') {
        if (
          key === 'question' ||
          key === 'enonce' ||
          key === 'contenu' ||
          key === 'content' ||
          key === 'message' ||
          key.startsWith('libelleEval')
        ) {
          value = safeDecodeBase64(value);
        } else {
          value = transform(value);
        }
      } else if (key === 'propositions' && Array.isArray(value)) {
        value = value.map((v) => (typeof v === 'string' ? safeDecodeBase64(v) : v));
      } else {
        value = transform(value);
      }

      result[key] = value;
    }
    return result;
  }

  return data;
}
