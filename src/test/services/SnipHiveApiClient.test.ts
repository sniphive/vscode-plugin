import * as assert from 'assert/strict';
import { SnipHiveApiClient } from '../../services/SnipHiveApiClient';

suite('SnipHiveApiClient', () => {
    let client: SnipHiveApiClient;
    let originalFetch: any;

    setup(() => {
        client = SnipHiveApiClient.getInstance();
        originalFetch = global.fetch;
    });

    teardown(() => {
        global.fetch = originalFetch;
    });

    test('should be a singleton', () => {
        const c2 = SnipHiveApiClient.getInstance();
        assert.strictEqual(client, c2);
    });

    test('GET returns success response', async () => {
        global.fetch = async (url: string | URL | globalThis.Request, options?: any) => {
            return {
                ok: true,
                status: 200,
                headers: new Headers(),
                text: async () => JSON.stringify({ userId: 1 })
            } as unknown as Response;
        };

        const res = await client.get<{ userId: number }>(
            'https://api.example.com',
            '/todos/1'
        );
        assert.strictEqual(res.success, true);
        assert.ok(res.data !== undefined);
        assert.strictEqual(res.data.userId, 1);
    });

    test('POST with body', async () => {
        global.fetch = async (url: string | URL | globalThis.Request, options?: any) => {
            return {
                ok: true,
                status: 201,
                headers: new Headers(),
                text: async () => JSON.stringify({ id: 1, title: 'test' })
            } as unknown as Response;
        };

        const res = await client.post<{ id: number; title: string }>(
            'https://api.example.com',
            '/posts',
            undefined,
            { title: 'test', body: 'bar', userId: 1 }
        );
        assert.strictEqual(res.success, true);
        assert.ok(res.data?.id);
    });

    test('handles 404 gracefully', async () => {
        global.fetch = async (url: string | URL | globalThis.Request, options?: any) => {
            return {
                ok: false,
                status: 404,
                headers: new Headers(),
                text: async () => JSON.stringify({ message: 'Not found' })
            } as unknown as Response;
        };

        const res = await client.get(
            'https://api.example.com',
            '/nonexistent-endpoint'
        );
        assert.strictEqual(res.success, false);
        assert.strictEqual(res.error, 'Not found');
    });

    test('handles network error gracefully', async () => {
        global.fetch = async (url: string | URL | globalThis.Request, options?: any) => {
            throw new Error('ECONNREFUSED');
        };

        const res = await client.get(
            'https://api.example.com',
            '/api/test'
        );
        assert.strictEqual(res.success, false);
        assert.ok(res.error?.includes('Network error: ECONNREFUSED'));
    });
});
