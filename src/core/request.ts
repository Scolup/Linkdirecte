// © 2026 typeof (Scolup) | Licensed under AGPL 3.0
import { getAccount } from './store';
import { EdAuthError } from './errors';
import type { Account } from '../types';
import type { FetchOptions } from './fetch';

export function requireCurrentAccount(): Account {
  const account = getAccount();

  if (!account) {
    throw new EdAuthError(
      'Not logged in. Call login() before using account-specific features.',
      'NOT_LOGGED_IN',
    );
  }

  return account;
}

export function postOptions<T extends FetchOptions = FetchOptions>(
  body: unknown,
  options: T = {} as T,
): T {
  return {
    method: 'POST',
    body,
    ...options,
  } as T;
}
