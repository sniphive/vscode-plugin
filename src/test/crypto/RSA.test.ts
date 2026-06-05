import * as assert from 'assert/strict';
import * as RSA from '../../crypto/RSA';

suite('RSA Crypto', () => {
    test('generate key pair', async () => {
        const keys = await RSA.generateKeyPair();
        assert.ok(keys.publicKey);
        assert.ok(keys.privateKey);
        assert.strictEqual(keys.publicKey.type, 'public');
        assert.strictEqual(keys.privateKey.type, 'private');
    });

    test('export and import public key JWK', async () => {
        const keys = await RSA.generateKeyPair();
        const jwk = await RSA.exportPublicKeyToJWK(keys.publicKey);
        assert.strictEqual(jwk.kty, 'RSA');
        assert.strictEqual(jwk.alg, 'RSA-OAEP-256');

        const imported = await RSA.importPublicKeyFromJWK(jwk);
        assert.strictEqual(imported.type, 'public');
    });

    test('export and import private key JWK', async () => {
        const keys = await RSA.generateKeyPair();
        const jwk = await RSA.exportPrivateKeyToJWK(keys.privateKey);
        assert.strictEqual(jwk.kty, 'RSA');

        const imported = await RSA.importPrivateKeyFromJWK(jwk);
        assert.strictEqual(imported.type, 'private');
    });

    test('encrypt and decrypt round-trip', async () => {
        const keys = await RSA.generateKeyPair();
        const original = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
        const encrypted = await RSA.encryptWithPublicKey(keys.publicKey, original.buffer);
        const decrypted = await RSA.decryptWithPrivateKey(keys.privateKey, encrypted);
        assert.deepStrictEqual(new Uint8Array(decrypted), original);
    });

    test('base64 encode/decode round-trip', () => {
        const original = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
        const encoded = RSA.arrayBufferToBase64(original.buffer);
        const decoded = RSA.base64ToArrayBuffer(encoded);
        assert.deepStrictEqual(new Uint8Array(decoded), original);
    });
});
