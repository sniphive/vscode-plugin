import * as RSA from './RSA';

export async function sealEnvelope(
    plaintext: string,
    publicKey: CryptoKey
): Promise<{ encryptedContent: string; encryptedDEK: string }> {
    // Generate a new DEK for this content
    const dek = await crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
    );

    // Generate random 12-byte IV for AES-GCM
    const iv = crypto.getRandomValues(new Uint8Array(12));

    // Encrypt content with DEK
    const ciphertext = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv as BufferSource },
        dek,
        new TextEncoder().encode(plaintext)
    );

    // Export DEK and encrypt with RSA public key
    const rawDEK = await crypto.subtle.exportKey('raw', dek);
    const encryptedDEK = await crypto.subtle.encrypt(
        { name: 'RSA-OAEP' },
        publicKey,
        rawDEK
    );

    return {
        encryptedContent: RSA.arrayBufferToBase64(iv.buffer as ArrayBuffer) + '.' + RSA.arrayBufferToBase64(ciphertext),
        encryptedDEK: RSA.arrayBufferToBase64(encryptedDEK),
    };
}

export async function openEnvelope(
    encryptedContent: string,
    encryptedDEK: string,
    privateKey: CryptoKey
): Promise<string> {
    // Parse IV and ciphertext
    const [ivBase64, ciphertextBase64] = encryptedContent.split('.');
    if (!ivBase64 || !ciphertextBase64) {
        throw new Error('Invalid encrypted content format: expected iv.ciphertext');
    }

    const iv = new Uint8Array(RSA.base64ToArrayBuffer(ivBase64));
    const ciphertext = RSA.base64ToArrayBuffer(ciphertextBase64);
    const encryptedDEKBuffer = RSA.base64ToArrayBuffer(encryptedDEK);

    // Decrypt DEK with RSA private key
    const rawDEK = await crypto.subtle.decrypt(
        { name: 'RSA-OAEP' },
        privateKey,
        encryptedDEKBuffer
    );

    // Import DEK
    const dek = await crypto.subtle.importKey(
        'raw',
        rawDEK,
        { name: 'AES-GCM', length: 256 },
        true,
        ['decrypt']
    );

    // Decrypt content with DEK
    const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv as BufferSource },
        dek,
        ciphertext
    );

    return new TextDecoder().decode(decrypted);
}

export async function decryptDEK(
    encryptedDEK: string,
    privateKey: CryptoKey
): Promise<string> {
    const encryptedDEKBuffer = RSA.base64ToArrayBuffer(encryptedDEK);
    const rawDEK = await crypto.subtle.decrypt(
        { name: 'RSA-OAEP' },
        privateKey,
        encryptedDEKBuffer
    );
    return RSA.arrayBufferToBase64(rawDEK);
}
