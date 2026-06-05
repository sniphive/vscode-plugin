import * as assert from 'assert/strict';
import * as AES from '../../crypto/AES';

suite('AES Crypto', () => {
    test('encrypt and decrypt round-trip', async () => {
        const dek = await AES.generateDEK();
        const plaintext = 'Hello, World! This is a test message.';

        const { ciphertext, iv } = await AES.encryptWithDEK(dek, plaintext);
        assert.ok(ciphertext.byteLength > 0);
        assert.strictEqual(iv.length, 12);

        const decrypted = await AES.decryptWithDEK(dek, ciphertext, iv);
        assert.strictEqual(decrypted, plaintext);
    });

    test('different keys produce different ciphertexts', async () => {
        const key1 = await AES.generateDEK();
        const key2 = await AES.generateDEK();
        const plaintext = 'Test message';

        const enc1 = await AES.encryptWithDEK(key1, plaintext);
        const enc2 = await AES.encryptWithDEK(key2, plaintext);

        const buf1 = new Uint8Array(enc1.ciphertext);
        const buf2 = new Uint8Array(enc2.ciphertext);
        assert.notDeepStrictEqual(buf1, buf2);
    });

    test('decrypt with wrong key fails', async () => {
        const dek = await AES.generateDEK();
        const wrongDek = await AES.generateDEK();
        const plaintext = 'Secret message';

        const { ciphertext, iv } = await AES.encryptWithDEK(dek, plaintext);

        await assert.rejects(
            () => AES.decryptWithDEK(wrongDek, ciphertext, iv),
            /operationerr/i
        );
    });

    test('encrypt empty string', async () => {
        const dek = await AES.generateDEK();
        const { ciphertext, iv } = await AES.encryptWithDEK(dek, '');
        const decrypted = await AES.decryptWithDEK(dek, ciphertext, iv);
        assert.strictEqual(decrypted, '');
    });

    test('encrypt unicode content', async () => {
        const dek = await AES.generateDEK();
        const plaintext = 'こんにちは世界 🌍 émojis и кириллица';
        const { ciphertext, iv } = await AES.encryptWithDEK(dek, plaintext);
        const decrypted = await AES.decryptWithDEK(dek, ciphertext, iv);
        assert.strictEqual(decrypted, plaintext);
    });
});
