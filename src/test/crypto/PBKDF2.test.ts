import * as assert from 'assert/strict';
import { deriveKey, deriveKeyRaw, generateSalt } from '../../crypto/PBKDF2';

suite('PBKDF2', () => {
    test('derives key from password', async () => {
        const salt = generateSalt();
        const key = await deriveKey('test-password', salt, 100);
        assert.strictEqual(key.type, 'secret');
        assert.strictEqual(key.algorithm.name, 'AES-GCM');
    });

    test('same password and salt produce same key bits', async () => {
        const password = 'my-master-password';
        const salt = generateSalt();
        const bits1 = await deriveKeyRaw(password, salt, 100, 256);
        const bits2 = await deriveKeyRaw(password, salt, 100, 256);
        assert.deepStrictEqual(new Uint8Array(bits1), new Uint8Array(bits2));
    });

    test('different passwords produce different key bits', async () => {
        const salt = generateSalt();
        const bits1 = await deriveKeyRaw('password1', salt, 100, 256);
        const bits2 = await deriveKeyRaw('password2', salt, 100, 256);
        assert.notDeepStrictEqual(new Uint8Array(bits1), new Uint8Array(bits2));
    });

    test('different salts produce different key bits', async () => {
        const salt1 = generateSalt();
        const salt2 = generateSalt();
        const bits1 = await deriveKeyRaw('password', salt1, 100, 256);
        const bits2 = await deriveKeyRaw('password', salt2, 100, 256);
        assert.notDeepStrictEqual(new Uint8Array(bits1), new Uint8Array(bits2));
    });

    test('high iteration count works', async () => {
        const salt = generateSalt();
        const key = await deriveKey('password', salt, 600000);
        assert.ok(key);
    }).timeout(10000);

    test('generated salt is 32 bytes', () => {
        const salt = generateSalt();
        assert.strictEqual(salt.length, 32);
    });

    test('generated salt is random', () => {
        const salt1 = generateSalt();
        const salt2 = generateSalt();
        assert.notDeepStrictEqual(salt1, salt2);
    });
});
