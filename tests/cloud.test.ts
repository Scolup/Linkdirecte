// © 2026 typeof (Scolup) | Licensed under AGPL 3.0
import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { getCloud, createFolder, deleteNodes, configure, clearSession } from '../src/index';
import { setAccount, setToken } from '../src/core/store';
import type { CloudNode } from '../src/types';

describe('Cloud Module', () => {
  let originalFetch: typeof globalThis.fetch;
  let lastRequest: { url: string; method: string; body: any } | null = null;

  const mockAccount = {
    idLogin: 1234567,
    id: 9876,
    uid: 'session_uid',
    identifiant: 'Test.user',
    typeCompte: 'E' as const,
    prenom: 'John',
    nom: 'Doe',
    email: 'john.doe@example.com',
    nomEtablissement: 'Ecole Test',
    main: true,
    profile: {
      sexe: 'M' as const,
      photo: 'https://example.com/photo.jpg',
    },
    modules: [{ code: 'CLOUD', enable: true, badge: 0, params: {} }],
  };

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    lastRequest = null;
    setAccount(mockAccount);
    setToken('test_token');
    configure({ maxRetries: 0 });
  });

  afterEach(async () => {
    globalThis.fetch = originalFetch;
    await clearSession();
  });

  it('gets cloud nodes with custom depth', async () => {
    globalThis.fetch = async (input, init) => {
      const urlStr = input.toString();
      const method = init?.method || 'GET';
      let parsedBody: any = undefined;
      if (init?.body) {
        const bodyStr = init.body.toString();
        if (bodyStr.startsWith('data=')) {
          parsedBody = JSON.parse(decodeURIComponent(bodyStr.substring(5)));
        } else {
          parsedBody = bodyStr;
        }
      }
      lastRequest = { url: urlStr, method, body: parsedBody };

      return new Response(
        JSON.stringify({
          code: 200,
          message: '',
          data: [
            {
              id: 'node_1',
              libelle: 'My Folder',
              type: 'folder',
              children: [],
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    };

    const result = await getCloud({ depth: 4 });

    expect(lastRequest).toBeDefined();
    expect(lastRequest!.url).toContain('/cloud/E/9876.awp');
    expect(lastRequest!.url).toContain('verbe=get');
    expect(lastRequest!.body).toEqual({ profondeur: 4 });
    expect(result.length).toBe(1);
    expect((result[0] as any).libelle).toBe('My Folder');
  });

  it('creates a new folder under a parent node', async () => {
    globalThis.fetch = async (input, init) => {
      const urlStr = input.toString();
      const method = init?.method || 'GET';
      let parsedBody: any = undefined;
      if (init?.body) {
        const bodyStr = init.body.toString();
        if (bodyStr.startsWith('data=')) {
          parsedBody = JSON.parse(decodeURIComponent(bodyStr.substring(5)));
        } else {
          parsedBody = bodyStr;
        }
      }
      lastRequest = { url: urlStr, method, body: parsedBody };

      return new Response(
        JSON.stringify({
          code: 200,
          message: '',
          data: {
            id: 'node_new',
            libelle: 'New Folder',
            type: 'folder',
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    };

    const parentNode: CloudNode = {
      id: 'parent_id',
      type: 'folder',
      libelle: 'Parent',
    } as any;

    const result = await createFolder('New Folder', parentNode);

    expect(lastRequest).toBeDefined();
    expect(lastRequest!.url).toContain('/cloud/E/9876.awp');
    expect(lastRequest!.url).toContain('verbe=post');
    expect(lastRequest!.body).toEqual({
      parentNode,
      libelle: 'New Folder',
      typeRessource: 'folder',
    });
    expect(result.id).toBe('node_new');
  });

  it('deletes nodes', async () => {
    globalThis.fetch = async (input, init) => {
      const urlStr = input.toString();
      const method = init?.method || 'GET';
      let parsedBody: any = undefined;
      if (init?.body) {
        const bodyStr = init.body.toString();
        if (bodyStr.startsWith('data=')) {
          parsedBody = JSON.parse(decodeURIComponent(bodyStr.substring(5)));
        } else {
          parsedBody = bodyStr;
        }
      }
      lastRequest = { url: urlStr, method, body: parsedBody };

      return new Response(
        JSON.stringify({
          code: 200,
          message: '',
          data: {
            success: true,
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    };

    const nodesToDelete: CloudNode[] = [
      { id: 'node_to_delete', type: 'file', libelle: 'Doc.pdf' } as any,
    ];

    const result = await deleteNodes(nodesToDelete);

    expect(lastRequest).toBeDefined();
    expect(lastRequest!.url).toContain('/cloud/E/9876/visibility.awp');
    expect(lastRequest!.url).toContain('verbe=delete');
    expect(lastRequest!.body).toEqual({ tabNodes: nodesToDelete });
    expect(result.success).toBe(true);
  });
});
