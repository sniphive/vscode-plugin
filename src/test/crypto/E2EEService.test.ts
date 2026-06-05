import * as assert from 'assert/strict';
import * as RSA from '../../crypto/RSA';
import * as AES from '../../crypto/AES';
import * as Envelope from '../../crypto/EnvelopeEncryption';
import { generateSalt, deriveKey, deriveKeyRaw } from '../../crypto/PBKDF2';

suite('E2EE Service Integration', () => {
    test('full E2EE flow: setup-like key generation and content encrypt/decrypt', async () => {
        // 1. Generate RSA key pair
        const keyPair = await RSA.generateKeyPair();

        // 2. Export/import JWK to simulate server round-trip
        const publicJwk = await RSA.exportPublicKeyToJWK(keyPair.publicKey);
        const privateJwk = await RSA.exportPrivateKeyToJWK(keyPair.privateKey);

        const importedPublic = await RSA.importPublicKeyFromJWK(publicJwk);
        const importedPrivate = await RSA.importPrivateKeyFromJWK(privateJwk);

        // 3. Encrypt content with envelope encryption
        const plaintext = 'console.log("Hello World");';
        const sealed = await Envelope.sealEnvelope(plaintext, importedPublic);

        // 4. Decrypt with private key
        const decrypted = await Envelope.openEnvelope(
            sealed.encryptedContent,
            sealed.encryptedDEK,
            importedPrivate
        );

        assert.strictEqual(decrypted, plaintext);
    });

    test('master password unlock flow', async () => {
        // 1. Generate key pair
        const keyPair = await RSA.generateKeyPair();
        const privateJwk = await RSA.exportPrivateKeyToJWK(keyPair.privateKey);

        // 2. Derive wrapping key from password (like master password)
        const password = 'my-master-password-123';
        const salt = generateSalt();
        const iterations = 600000;
        const wrappingKey = await deriveKey(password, salt, iterations);

        // 3. Encrypt private key with wrapping key (like what server stores)
        const { ciphertext, iv } = await AES.encryptWithAESKey(
            wrappingKey,
            JSON.stringify(privateJwk)
        );

        // 4. Later: re-derive wrapping key from password
        const reDerivedKey = await deriveKey(password, salt, iterations);

        // 5. Decrypt private key
        const decryptedJwkStr = await AES.decryptWithAESKey(
            reDerivedKey,
            ciphertext,
            iv
        );
        const decryptedJwk = JSON.parse(decryptedJwkStr);

        // 6. Import decrypted private key and use it
        const importedPrivate = await RSA.importPrivateKeyFromJWK(decryptedJwk);
        const importedPublic = await RSA.importPublicKeyFromJWK(
            await RSA.exportPublicKeyToJWK(keyPair.publicKey)
        );

        // 7. Encrypt + decrypt content to verify
        const sealed = await Envelope.sealEnvelope('Test content', importedPublic);
        const result = await Envelope.openEnvelope(
            sealed.encryptedContent,
            sealed.encryptedDEK,
            importedPrivate
        );
        assert.strictEqual(result, 'Test content');
    }).timeout(15000);

    test('wrong password cannot unlock', async () => {
        const keyPair = await RSA.generateKeyPair();
        const privateJwk = await RSA.exportPrivateKeyToJWK(keyPair.privateKey);

        const password = 'correct-password';
        const salt = generateSalt();
        const wrappingKey = await deriveKey(password, salt, 1000);
        const { ciphertext, iv } = await AES.encryptWithAESKey(wrappingKey, JSON.stringify(privateJwk));

        // Try with wrong password
        const wrongKey = await deriveKey('wrong-password', salt, 1000);

        await assert.rejects(
            () => AES.decryptWithAESKey(wrongKey, ciphertext, iv),
            /operationerr/i
        );
    }).timeout(5000);

    test('recovery flow with separate salt', async () => {
        const keyPair = await RSA.generateKeyPair();
        const privateJwk = await RSA.exportPrivateKeyToJWK(keyPair.privateKey);

        // Recovery uses different salt
        const recoveryCode = 'recovery-code-12345';
        const recoverySalt = generateSalt();
        const recoveryKey = await deriveKey(recoveryCode, recoverySalt, 600000);

        const { ciphertext, iv } = await AES.encryptWithAESKey(recoveryKey, JSON.stringify(privateJwk));

        // Recover
        const reDerivedKey = await deriveKey(recoveryCode, recoverySalt, 600000);
        const decryptedJwkStr = await AES.decryptWithAESKey(reDerivedKey, ciphertext, iv);
        const decryptedJwk = JSON.parse(decryptedJwkStr);
        assert.strictEqual(decryptedJwk.kty, 'RSA');
    }).timeout(15000);
});
