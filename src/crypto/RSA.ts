export async function generateKeyPair(): Promise<CryptoKeyPair> {
    return crypto.subtle.generateKey(
        {
            name: 'RSA-OAEP',
            modulusLength: 4096,
            publicExponent: new Uint8Array([1, 0, 1]),
            hash: 'SHA-256',
        },
        true,
        ['encrypt', 'decrypt']
    );
}

export async function exportPublicKeyToJWK(key: CryptoKey): Promise<JsonWebKey> {
    return crypto.subtle.exportKey('jwk', key);
}

export async function exportPrivateKeyToJWK(key: CryptoKey): Promise<JsonWebKey> {
    return crypto.subtle.exportKey('jwk', key);
}

export async function importPublicKeyFromJWK(jwk: JsonWebKey): Promise<CryptoKey> {
    delete jwk.key_ops;
    return crypto.subtle.importKey(
        'jwk', jwk,
        { name: 'RSA-OAEP', hash: 'SHA-256' },
        true,
        ['encrypt']
    );
}

export async function importPrivateKeyFromJWK(jwk: JsonWebKey): Promise<CryptoKey> {
    delete jwk.key_ops;
    return crypto.subtle.importKey(
        'jwk', jwk,
        { name: 'RSA-OAEP', hash: 'SHA-256' },
        true,
        ['decrypt']
    );
}

export async function encryptWithPublicKey(publicKey: CryptoKey, data: ArrayBuffer): Promise<ArrayBuffer> {
    return crypto.subtle.encrypt(
        { name: 'RSA-OAEP' },
        publicKey,
        data
    );
}

export async function decryptWithPrivateKey(privateKey: CryptoKey, data: ArrayBuffer): Promise<ArrayBuffer> {
    return crypto.subtle.decrypt(
        { name: 'RSA-OAEP' },
        privateKey,
        data
    );
}

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
}
