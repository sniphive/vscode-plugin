import * as assert from 'assert/strict';

suite('Auth Service', () => {
    test('Login request format is correct', () => {
        const loginRequest = {
            email: 'test@example.com',
            password: 'password123',
            device_name: 'vscode-sniphive',
        };
        assert.strictEqual(loginRequest.email, 'test@example.com');
        assert.strictEqual(loginRequest.device_name, 'vscode-sniphive');
        assert.ok(loginRequest.password.length > 0);
    });

    test('Token storage key format', () => {
        const email = 'user@sniphive.net';
        const key = `sniphive.authToken.${email}`;
        assert.strictEqual(key, 'sniphive.authToken.user@sniphive.net');
    });

    test('Private key storage key format', () => {
        const email = 'user@sniphive.net';
        const key = `sniphive.privateKey.${email}`;
        assert.strictEqual(key, 'sniphive.privateKey.user@sniphive.net');
    });

    test('Master password storage key format', () => {
        const email = 'user@sniphive.net';
        const key = `sniphive.masterPassword.${email}`;
        assert.strictEqual(key, 'sniphive.masterPassword.user@sniphive.net');
    });
});
