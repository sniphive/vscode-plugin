import * as assert from 'assert/strict';
import { SnipHiveApiClient, ApiResponse } from '../../services/SnipHiveApiClient';

suite('SnipHiveApiClient', () => {
    let client: SnipHiveApiClient;

    setup(() => {
        client = SnipHiveApiClient.getInstance();
    });

    test('should be a singleton', () => {
        const c2 = SnipHiveApiClient.getInstance();
        assert.strictEqual(client, c2);
    });

    test('GET returns success response', async () => {
        const res = await client.get<{ userId: number }>(
            'https://jsonplaceholder.typicode.com',
            '/todos/1'
        );
        assert.strictEqual(res.success, true);
        assert.ok(res.data !== undefined);
    });

    test('POST with body', async () => {
        const res = await client.post<{ id: number; title: string }>(
            'https://jsonplaceholder.typicode.com',
            '/posts',
            undefined,
            { title: 'test', body: 'bar', userId: 1 }
        );
        assert.strictEqual(res.success, true);
        assert.ok(res.data?.id);
    });

    test('handles 404 gracefully', async () => {
        const res = await client.get(
            'https://jsonplaceholder.typicode.com',
            '/nonexistent-endpoint-12345'
        );
        assert.strictEqual(res.success, false);
        assert.ok(res.error);
    });

    test('handles network error gracefully', async () => {
        const res = await client.get(
            'https://this-domain-does-not-exist-12345.com',
            '/api/test'
        );
        assert.strictEqual(res.success, false);
        assert.ok(res.error);
    });
});
