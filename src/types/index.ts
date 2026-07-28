// © 2026 typeof (Scolup) | Licensed under AGPL 3.0
export interface EdResponse<T> {
  host: string;
  code: number;
  token?: string;
  message: string;
  data: T;
}

export type AccountType = 'E' | 'P' | 'A' | 'F';

export interface Account {
  idLogin: number;
  id: number;
  uid: string;
  identifiant: string;
  typeCompte: AccountType;
  prenom: string;
  nom: string;
  email: string;
  nomEtablissement: string;
  main: boolean;
  accessToken?: string;
  profile: {
    sexe: 'M' | 'F';
    photo: string;
    classe?: {
      id: number;
      code: string;
      libelle: string;
    };
  };
  modules: Array<{
    code: string;
    enable: boolean;
    badge: number;
    params: Record<string, any>;
  }>;
}

export interface UserProfile {
  token: string;
  accounts: Account[];
}

export interface LoginChallenge {
  type: 'securityQuestion';
  question: string;
  choices: string[];
  answer: (choiceIndexOrText: number | string) => Promise<LoginSuccess>;
}

export interface LoginSuccess {
  type: 'success';
  user: Account;
  token: string;
  sessionId: string;
}

export interface AccountSettings {
  id: number;
  identifiant: string;
  email: string;
  portable: string;
  questionSecrete: string;
  reponse: string;
  accessToken: string;
  possibleQuestions: string[];
}

export type LoginResult = LoginChallenge | LoginSuccess;

export interface EdConfig {
  userAgent?: string;
  proxyUrl?: string;
  maxRetries?: number;
  retryDelay?: number;
  concurrency?: number;
  timeout?: number;
  storage?: StorageAdapter;
  passkey?: string;
  offlineQueue?: boolean;
  prefetch?: PrefetchConfig;
  onError?: ErrorMiddleware;
  on2faRequired?: (
    question: string,
    choices: string[],
  ) => number | string | Promise<number | string>;
  onCredentialsRequired?: () =>
    | { identifiant: string; motdepasse: string }
    | Promise<{ identifiant: string; motdepasse: string }>;
  cache?: CacheConfig;
  cacheMaxEntries?: number;
}

export interface StorageAdapter {
  get(key: string): string | null | Promise<string | null>;
  set(key: string, value: string): void | Promise<void>;
  delete(key: string): void | Promise<void>;
}

export interface PrefetchConfig {
  enabled?: boolean;
  interval?: string | false;
  modules?: string[];
}

export interface CacheConfig {
  grades?: string | false;
  timetable?: string | false;
  messages?: string | false;
  homework?: string | false;
  documents?: string | false;
  cloud?: string | false;
  attendance?: string | false;
  timeline?: string | false;
}

export type ErrorMiddleware = (
  error: any,
  retry: (options?: { delay?: number }) => Promise<unknown>,
) => void | Promise<void>;

export interface CloudNode {
  id: string;
  type: 'file' | 'folder';
  libelle: string;
  date: string;
  taille: number;
  readonly: boolean;
  hidden: boolean;
  isTrash: boolean;
  isLoaded?: boolean;
  quota?: number;
  displayText?: string;
  children?: CloudNode[];
  proprietaire?: {
    id: number;
    type: string;
    nom: string;
    prenom: string;
    particule: string;
  };
}

export interface CloudFolderNode extends CloudNode {
  type: 'folder';
  children: CloudNode[];
}

export interface CloudFileNode extends CloudNode {
  type: 'file';
}

export type CloudEntry = CloudFolderNode | CloudFileNode;
