// © 2026 typeof (Scolup) | Licensed under AGPL 3.
import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { getMessages, getMessage, sendMessage, configure, clearSession } from '../src/index';
import { setAccount, setToken } from '../src/core/store';

describe('Messages Module', () => {
  let originalFetch: typeof globalThis.fetch;
  let requests: { url: string; method: string; body: any }[] = [];

  const mockAccount = {
    loginId: 1234567,
    id: 9876,
    uid: 'session_uid',
    identifiant: 'Test.user',
    accountType: 'E' as const,
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    schoolName: 'Ecole Test',
    main: true,
    profile: {
      sexe: 'M' as const,
      photoUrl: 'https://example.com/photo.jpg',
    },
    modules: [{ code: 'MESSAGERIE', enable: true, badge: 0, params: {} }],
  };

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    requests = [];
    setAccount(mockAccount);
    setToken('test_token');
    configure({ maxRetries: 0 });
  });

  afterEach(async () => {
    globalThis.fetch = originalFetch;
    await clearSession();
  });

  it('fetches message list', async () => {
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
      requests.push({ url: urlStr, method, body: parsedBody });

      return new Response(
        JSON.stringify({
          code: 200,
          message: '',
          data: {
            messages: {
              received: [
                {
                  id: 111,
                  subject: 'Welcome',
                  mtype: 'received',
                },
              ],
            },
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    };

    const result = await getMessages();

    expect(requests.length).toBe(1);
    expect(requests[0].url).toContain('/eleves/9876/messages.awp');
    expect(requests[0].body.idClasseur).toBeUndefined();
    expect(result.messages?.received).toBeDefined();
    expect(result.messages!.received![0].id).toBe(111);
    expect(result.messages!.received![0].subject).toBe('Welcome');
  });

  it('sends idClasseur in body when folderId is provided', async () => {
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
      requests.push({ url: urlStr, method, body: parsedBody });

      return new Response(
        JSON.stringify({
          code: 200,
          message: '',
          data: {
            messages: {
              received: [],
            },
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    };

    await getMessages({ folderId: 42 });

    expect(requests.length).toBe(1);
    expect(requests[0].url).toContain('/eleves/9876/messages.awp');
    expect(requests[0].body.idClasseur).toBe(42);
  });

  it('fetches message content when withContent is true', async () => {
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
      requests.push({ url: urlStr, method, body: parsedBody });

      if (urlStr.includes('messages.awp')) {
        return new Response(
          JSON.stringify({
            code: 200,
            message: '',
            data: {
              messages: {
                received: [
                  {
                    id: 111,
                    subject: 'Welcome',
                  },
                ],
              },
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      } else if (urlStr.includes('messages/111.awp')) {
        return new Response(
          JSON.stringify({
            code: 200,
            message: '',
            data: {
              id: 111,
              subject: 'Welcome',
              content: 'Hello World',
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }

      return new Response(JSON.stringify({ code: 404 }), { status: 404 });
    };

    const result = await getMessages({ withContent: true });

    expect(requests.length).toBe(2);
    expect(requests[0].url).toContain('/eleves/9876/messages.awp');
    expect(requests[1].url).toContain('/eleves/9876/messages/111.awp');
    expect(result.messages!.received![0].content).toBe('Hello World');
  });

  it('sends message successfully', async () => {
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
      requests.push({ url: urlStr, method, body: parsedBody });

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

    const data = {
      subject: 'Hello',
      content: 'This is a test message',
      destinataires: ['TeacherA'],
    };

    const result = await sendMessage(data);

    expect(requests.length).toBe(1);
    expect(requests[0].url).toContain('/eleves/9876/messages.awp');
    expect(requests[0].body.message.subject).toBe('Hello');
    expect(result.success).toBe(true);
  });
});
// © 2026 typeof (Scolup) | Licensed under AGPL 3.
