// © 2026 typeof (Scolup) | Licensed under AGPL 3.0
import {
  getConfig,
  getAccount,
  getToken,
  getTwofaToken,
  setToken,
  setTwofaToken,
  setAccount,
  setAccounts,
  persistSession,
  loadSession,
  clearSession,
  setConfig,
} from '../core/store';
import {
  buildApiUrl,
  buildRequestBody,
  buildHeaders,
  sendRequest,
  parseJsonResponse,
} from '../core/http';
import { EdAuthError, getFriendlyErrorMessage } from '../core/errors';
import { assertNonEmptyString } from '../core/validate';
import { randomUUID } from '../core/env';
import {
  LoginResult,
  LoginSuccess,
  LoginChallenge,
  Account,
  StorageAdapter,
  EdConfig,
} from '../types';
import { transform, decodeBase64 } from '../core/transform';
import { startTokenKeepalive, stopTokenKeepalive } from '../core/health';

export interface LoginOptions {
  rememberMe?: boolean;
  on2faRequired?: (
    question: string,
    choices: string[],
  ) => number | string | Promise<number | string>;
  storage?: StorageAdapter;
  passkey?: string;
}

export interface LoginUnifiedOptions extends LoginOptions {
  identifiant?: string;
  username?: string;
  identifier?: string;
  motdepasse?: string;
  password?: string;
}

export async function login(
  identifiantOrParams: string | LoginUnifiedOptions,
  motdepasse?: string,
  options: LoginOptions = {},
): Promise<LoginResult> {
  let identifiant = '';
  let password = '';
  let finalOpts = options;

  if (typeof identifiantOrParams === 'object' && identifiantOrParams !== null) {
    identifiant =
      identifiantOrParams.identifiant ||
      identifiantOrParams.username ||
      identifiantOrParams.identifier ||
      '';
    password = identifiantOrParams.motdepasse || identifiantOrParams.password || '';
    const {
      identifiant: _,
      username: __,
      identifier: ___,
      motdepasse: ____,
      password: _____,
      ...rest
    } = identifiantOrParams;
    finalOpts = rest;
  } else {
    identifiant = identifiantOrParams;
    password = motdepasse || '';
  }

  assertNonEmptyString(identifiant, 'identifiant');
  assertNonEmptyString(password, 'motdepasse');

  const configUpdate: Partial<EdConfig> = {};
  if (finalOpts.storage !== undefined) configUpdate.storage = finalOpts.storage;
  if (finalOpts.passkey !== undefined) configUpdate.passkey = finalOpts.passkey;
  if (Object.keys(configUpdate).length > 0) setConfig(configUpdate);

  const gtk = await fetchGtkToken();
  let uuid = '';
  if (finalOpts.rememberMe) {
    const storage = getConfig().storage;
    const stored = await storage?.get(`ed_uuid_${identifiant}`);
    if (stored) {
      uuid = stored;
    } else {
      uuid = randomUUID();
      await storage?.set(`ed_uuid_${identifiant}`, uuid);
    }
  } else {
    uuid = randomUUID();
  }

  const {
    data: initRes,
    twofaToken,
    xToken,
  } = await sendAuthRequest(
    '/login.awp',
    {
      isReLogin: false,
      identifiant,
      motdepasse: password,
      sesouvenirdemoi: finalOpts.rememberMe ?? false,
      uuid,
      fa: [],
    },
    gtk,
  );

  if (initRes.code === 250) {
    return handleTwoFactor(identifiant, password, uuid, finalOpts, gtk, twofaToken, xToken);
  }

  if (initRes.code !== 200) {
    const rawMsg = initRes.message || 'Login failed';
    const friendlyMsg = getFriendlyErrorMessage(String(initRes.code), rawMsg);
    throw new EdAuthError(friendlyMsg, String(initRes.code), undefined, initRes);
  }

  if (xToken) setToken(xToken);
  if (twofaToken) setTwofaToken(twofaToken);

  const success = await handleLoginSuccess(initRes, uuid, finalOpts);
  await persistSession();
  startTokenKeepalive();
  return success;
}

async function sendAuthRequest(
  endpoint: string,
  body: Record<string, unknown>,
  gtk: string,
  twofaToken?: string,
  xToken?: string,
): Promise<{ data: any; twofaToken: string; xToken: string }> {
  const headers: Record<string, string> = {
    ...buildHeaders({ skipAuth: true, useGtk: gtk }),
  };
  if (twofaToken) headers['2FA-Token'] = twofaToken;
  if (xToken) headers['X-Token'] = xToken;

  const response = await sendRequest({
    url: buildApiUrl(endpoint).toString(),
    method: 'POST',
    headers,
    body: buildRequestBody(endpoint, body),
  });

  const data = await parseJsonResponse(response);
  return {
    data,
    twofaToken: response.headers.get('2fa-token') || '',
    xToken: response.headers.get('x-token') || '',
  };
}

async function fetchGtkToken(): Promise<string> {
  const response = await sendRequest({
    url: buildApiUrl('/login.awp?gtk=1').toString(),
    method: 'GET',
    headers: buildHeaders({ skipAuth: true }),
  });
  const cookies = response.headers.get('set-cookie') || '';
  const match = cookies.match(/GTK=([^;]+)/);
  return match ? match[1] : '';
}

async function handleTwoFactor(
  identifiant: string,
  motdepasse: string,
  uuid: string,
  options: LoginOptions,
  gtk: string,
  twofaToken: string,
  xToken: string,
): Promise<LoginChallenge | LoginSuccess> {
  const {
    data: challenge,
    twofaToken: t3,
    xToken: x3,
  } = await sendAuthRequest('/connexion/doubleauth.awp?verbe=get', {}, gtk, twofaToken, xToken);

  if (challenge.code !== 200) {
    const rawMsg = challenge.message || '2FA challenge request failed';
    const friendlyMsg = getFriendlyErrorMessage(String(challenge.code), rawMsg);
    throw new EdAuthError(friendlyMsg, String(challenge.code), undefined, challenge);
  }

  const question = decodeBase64(challenge.data.question);
  const choices = challenge.data.propositions.map(decodeBase64);

  const answer = async (choice: number | string): Promise<LoginSuccess> => {
    let index = -1;
    if (typeof choice === 'number') {
      index = choice;
    } else {
      index = choices.indexOf(choice);
      if (index === -1) {
        const lower = choice.toLowerCase();
        index = choices.findIndex((c: string) => c.toLowerCase() === lower);
      }
    }

    if (index === -1 || index >= challenge.data.propositions.length) {
      throw new EdAuthError(
        `Invalid 2FA choice: "${choice}". Must be a valid index (0 to ${choices.length - 1}) or one of the valid options: [${choices.join(', ')}].`,
        'INVALID_2FA_CHOICE',
      );
    }

    const selected = challenge.data.propositions[index];
    const {
      data: validate,
      twofaToken: t4,
      xToken: x4,
    } = await sendAuthRequest(
      '/connexion/doubleauth.awp?verbe=post',
      { choix: selected },
      gtk,
      t3,
      x3,
    );

    if (validate.code !== 200) {
      const rawMsg = validate.message || '2FA validation failed';
      const friendlyMsg = getFriendlyErrorMessage(String(validate.code), rawMsg);
      throw new EdAuthError(friendlyMsg, String(validate.code), undefined, validate);
    }

    const { cn, cv } = validate.data;
    const {
      data: finalRes,
      twofaToken: t5,
      xToken: x5,
    } = await sendAuthRequest(
      '/login.awp',
      {
        isReLogin: false,
        identifiant,
        motdepasse,
        sesouvenirdemoi: options.rememberMe ?? false,
        cn,
        cv,
        uuid,
        fa: [],
      },
      gtk,
      t4,
      x4,
    );

    if (finalRes.code !== 200) {
      const rawMsg = finalRes.message || 'Login failed';
      const friendlyMsg = getFriendlyErrorMessage(String(finalRes.code), rawMsg);
      throw new EdAuthError(friendlyMsg, String(finalRes.code), undefined, finalRes);
    }

    if (x5) setToken(x5);
    if (t5) setTwofaToken(t5);

    const success = await handleLoginSuccess(finalRes, uuid, options);
    await persistSession();
    startTokenKeepalive();
    return success;
  };

  const on2fa = options.on2faRequired || getConfig().on2faRequired;
  if (on2fa) {
    const choice = await on2fa(question, choices);
    return answer(choice);
  }

  return { type: 'securityQuestion', question, choices, answer };
}

async function handleLoginSuccess(
  result: any,
  uuid: string,
  options: LoginOptions,
): Promise<LoginSuccess> {
  const transformed = transform(result.data);
  const accounts = transformed.accounts as Account[];
  const main = accounts.find((a) => a.main) || accounts[0];
  setAccount(main);
  setAccounts(accounts);

  if (options.rememberMe) {
    const storage = getConfig().storage;
    if (storage && main.accessToken) {
      await storage.set(`ed_access_token_${main.id}`, main.accessToken);
      if (uuid) {
        await storage.set(`ed_uuid_${main.id}`, uuid);
      }
    }
  }

  return {
    type: 'success',
    user: main,
    token: result.token || getToken() || '',
    sessionId: main.uid,
  };
}

export async function logout(): Promise<void> {
  stopTokenKeepalive();
  await clearSession();
}

export async function refreshToken(): Promise<string> {
  let account = getAccount();
  if (!account) {
    await loadSession();
    account = getAccount();
    if (!account) {
      throw new EdAuthError('No account found for refresh', 'NO_ACCOUNT');
    }
  }

  const config = getConfig();
  const storage = config.storage;
  const accessToken = await storage?.get(`ed_access_token_${account.id}`);
  const uuid = await storage?.get(`ed_uuid_${account.id}`);

  let refreshError: any = null;

  if (accessToken) {
    try {
      const gtk = await fetchGtkToken();
      const { data, xToken, twofaToken } = await sendAuthRequest(
        '/login.awp',
        {
          identifiant: account.identifiant,
          isReLogin: true,
          motdepasse: '???',
          accesstoken: accessToken,
          typeCompte: account.typeCompte,
          uuid: uuid || '',
        },
        gtk,
        getTwofaToken(),
        getToken(),
      );

      if (data.code !== 200) {
        const rawMsg = data.message || 'Refresh failed';
        const friendlyMsg = getFriendlyErrorMessage(String(data.code), rawMsg);
        throw new EdAuthError(friendlyMsg, String(data.code), undefined, data);
      }

      if (xToken) setToken(xToken);
      if (twofaToken) setTwofaToken(twofaToken);

      startTokenKeepalive();
      return xToken || data.token || '';
    } catch (error) {
      refreshError = error;
      config.onError?.(error, async () => {});
    }
  }

  if (config.onCredentialsRequired) {
    try {
      const { identifiant, motdepasse } = await config.onCredentialsRequired();
      const res = await login(identifiant, motdepasse, { rememberMe: true });
      if ('token' in res) return res.token;
    } catch (err) {
      if (refreshError) throw refreshError;
      throw err;
    }
  }

  if (refreshError) {
    throw refreshError;
  }

  throw new EdAuthError('Refresh failed', 'REFRESH_FAILED');
}
