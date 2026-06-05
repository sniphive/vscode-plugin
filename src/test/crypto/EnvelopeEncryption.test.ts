import * as assert from 'assert/strict';
import * as Envelope from '../../crypto/EnvelopeEncryption';
import * as RSA from '../../crypto/RSA';

suite('EnvelopeEncryption', () => {
    let publicKey: CryptoKey;
    let privateKey: CryptoKey;

    setup(async () => {
        const keys = await RSA.generateKeyPair();
        publicKey = keys.publicKey;
        privateKey = keys.privateKey;
    });

    test('seal and open round-trip', async () => {
        const plaintext = 'This is a secret message that should be encrypted.';

        const sealed = await Envelope.sealEnvelope(plaintext, publicKey);
        assert.ok(sealed.encryptedContent.length > 0);
        assert.ok(sealed.encryptedDEK.length > 0);

        const decrypted = await Envelope.openEnvelope(
            sealed.encryptedContent,
            sealed.encryptedDEK,
            privateKey
        );
        assert.strictEqual(decrypted, plaintext);
    });

    test('each seal produces different ciphertext', async () => {
        const plaintext = 'Repeated message';
        const s1 = await Envelope.sealEnvelope(plaintext, publicKey);
        const s2 = await Envelope.sealEnvelope(plaintext, publicKey);
        assert.notStrictEqual(s1.encryptedContent, s2.encryptedContent);
    });

    test('open with wrong private key fails', async () => {
        const otherKeys = await RSA.generateKeyPair();
        const plaintext = 'Secret data';

        const sealed = await Envelope.sealEnvelope(plaintext, publicKey);

        await assert.rejects(
            () => Envelope.openEnvelope(
                sealed.encryptedContent,
                sealed.encryptedDEK,
                otherKeys.privateKey
            ),
            /operationerr/i
        );
    });

    test('seal large content', async () => {
        const plaintext = 'x'.repeat(10000);
        const sealed = await Envelope.sealEnvelope(plaintext, publicKey);
        const decrypted = await Envelope.openEnvelope(
            sealed.encryptedContent,
            sealed.encryptedDEK,
            privateKey
        );
        assert.strictEqual(decrypted, plaintext);
    });
});
