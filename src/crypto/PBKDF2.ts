export async function deriveKey(
    password: string,
    salt: Uint8Array,
    iterations: number,
    keyLength: number = 256
): Promise<CryptoKey> {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
        'raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']
    );
    return crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt: salt.buffer as ArrayBuffer, iterations, hash: 'SHA-256' },
        keyMaterial,
        { name: 'AES-GCM', length: keyLength },
        false,
        ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey']
    );
}

export async function deriveKeyRaw(
    password: string,
    salt: Uint8Array,
    iterations: number,
    keyLengthBits: number = 256
): Promise<ArrayBuffer> {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
        'raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']
    );
    return crypto.subtle.deriveBits(
        { name: 'PBKDF2', salt: salt.buffer as ArrayBuffer, iterations, hash: 'SHA-256' },
        keyMaterial,
        keyLengthBits
    );
}

export function generateSalt(length: number = 32): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(length));
}
