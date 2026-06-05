export async function generateDEK(): Promise<CryptoKey> {
    return crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
    );
}

export async function encryptWithDEK(dek: CryptoKey, plaintext: string): Promise<{ ciphertext: ArrayBuffer; iv: Uint8Array }> {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const enc = new TextEncoder();
    const ciphertext = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv as BufferSource },
        dek,
        enc.encode(plaintext)
    );
    return { ciphertext, iv };
}

export async function decryptWithDEK(dek: CryptoKey, ciphertext: ArrayBuffer, iv: Uint8Array): Promise<string> {
    const dec = new TextDecoder();
    const plaintext = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv as BufferSource },
        dek,
        ciphertext
    );
    return dec.decode(plaintext);
}

export async function wrapDEK(dek: CryptoKey, wrappingKey: CryptoKey): Promise<{ wrappedKey: ArrayBuffer; iv: Uint8Array }> {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const wrappedKey = await crypto.subtle.wrapKey(
        'raw', dek, wrappingKey,
        { name: 'AES-GCM', iv: iv.buffer }
    );
    return { wrappedKey, iv };
}

export async function unwrapDEK(wrappedKey: ArrayBuffer, wrappingKey: CryptoKey, iv: Uint8Array): Promise<CryptoKey> {
    return crypto.subtle.unwrapKey(
        'raw', wrappedKey, wrappingKey,
        { name: 'AES-GCM', iv: iv as BufferSource },
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
    );
}

export async function encryptWithAESKey(key: CryptoKey, plaintext: string): Promise<{ ciphertext: ArrayBuffer; iv: Uint8Array }> {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const enc = new TextEncoder();
    const ciphertext = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv as BufferSource },
        key,
        enc.encode(plaintext)
    );
    return { ciphertext, iv };
}

export async function decryptWithAESKey(key: CryptoKey, ciphertext: ArrayBuffer, iv: Uint8Array): Promise<string> {
    const dec = new TextDecoder();
    const plaintext = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv as BufferSource },
        key,
        ciphertext
    );
    return dec.decode(plaintext);
}
