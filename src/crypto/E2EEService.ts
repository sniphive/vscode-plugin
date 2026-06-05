import * as vscode from 'vscode';
import { SnipHiveApiService } from '../services/SnipHiveApiService';
import { SnipHiveAuthService } from '../services/SnipHiveAuthService';
import { SecurityStatus, E2EEProfile } from '../models/Auth';
import { deriveKey, deriveKeyRaw, generateSalt } from './PBKDF2';
import * as AES from './AES';
import * as RSA from './RSA';
import * as Envelope from './EnvelopeEncryption';
import { outputChannel } from '../extension';

export class E2EEService {
    private static instance: E2EEService;
    private context: vscode.ExtensionContext;
    private privateKey: CryptoKey | null = null;

    private constructor(context: vscode.ExtensionContext) {
        this.context = context;
    }

    static getInstance(context?: vscode.ExtensionContext): E2EEService {
        if (!this.instance) {
            if (!context) throw new Error('E2EEService not initialized');
            this.instance = new E2EEService(context);
        }
        return this.instance;
    }

    async getPrivateKey(): Promise<CryptoKey | null> {
        if (this.privateKey) return this.privateKey;

        const email = SnipHiveAuthService.getInstance().getUserEmail();
        if (!email) return null;

        const stored = await this.context.secrets.get('sniphive.privateKey.' + email);
        if (!stored) return null;

        try {
            const jwk = JSON.parse(stored);
            this.privateKey = await RSA.importPrivateKeyFromJWK(jwk);
            return this.privateKey;
        } catch {
            return null;
        }
    }

    async storePrivateKey(key: CryptoKey) {
        const email = SnipHiveAuthService.getInstance().getUserEmail();
        if (!email) return;
        const jwk = await RSA.exportPrivateKeyToJWK(key);
        await this.context.secrets.store('sniphive.privateKey.' + email, JSON.stringify(jwk));
        this.privateKey = key;
    }

    async tryAutoUnlock(): Promise<boolean> {
        const email = SnipHiveAuthService.getInstance().getUserEmail();
        if (!email) return false;

        const masterPassword = await this.context.secrets.get('sniphive.masterPassword.' + email);
        if (!masterPassword) return false;

        const api = SnipHiveApiService.getInstance();
        const status = await api.getSecurityStatus();
        if (!status || !status.setup_complete || !status.e2ee_profile) return false;

        try {
            const privateKey = await this.unlockWithPassword(masterPassword, status.e2ee_profile);
            await this.storePrivateKey(privateKey);
            return true;
        } catch {
            await this.context.secrets.delete('sniphive.masterPassword.' + email);
            return false;
        }
    }

    async unlockWithPassword(password: string, profile: E2EEProfile): Promise<CryptoKey> {
        try {
            outputChannel.appendLine(`[E2EEService] unlockWithPassword: salt length = ${profile.kdf_salt.length}, iterations = ${profile.kdf_iterations}`);
            const salt = RSA.base64ToArrayBuffer(profile.kdf_salt);
            const wrappingKey = await deriveKey(password, new Uint8Array(salt), profile.kdf_iterations);
            outputChannel.appendLine(`[E2EEService] unlockWithPassword: PBKDF2 key derived successfully`);

            const encryptedPrivateKey = RSA.base64ToArrayBuffer(profile.encrypted_private_key);
            const iv = new Uint8Array(RSA.base64ToArrayBuffer(profile.private_key_iv));
            outputChannel.appendLine(`[E2EEService] unlockWithPassword: encryptedPrivateKey length = ${encryptedPrivateKey.byteLength}, iv length = ${iv.byteLength}`);

            const decryptedBytes = await crypto.subtle.decrypt(
                { name: 'AES-GCM', iv: iv as BufferSource },
                wrappingKey,
                encryptedPrivateKey
            );
            const jwkString = new TextDecoder().decode(decryptedBytes);
            const jwk = JSON.parse(jwkString);

            // Use usages from JWK key_ops if present, or default to ['decrypt']
            const usages: KeyUsage[] = jwk.key_ops || ['decrypt'];
            const privateKey = await crypto.subtle.importKey(
                'jwk',
                jwk,
                { name: 'RSA-OAEP', hash: 'SHA-256' },
                true,
                usages
            );
            return privateKey;
        } catch (e: any) {
            outputChannel.appendLine(`[E2EEService] decrypt and import failed: ${e.message}`);
            throw e;
        }
    }

    async unlockAndStore(password: string): Promise<boolean> {
        const email = SnipHiveAuthService.getInstance().getUserEmail();
        outputChannel.appendLine(`[E2EEService] Starting unlockAndStore for email: ${email}`);
        if (!email) {
            outputChannel.appendLine(`[E2EEService] Error: No stored email found!`);
            return false;
        }

        const api = SnipHiveApiService.getInstance();
        outputChannel.appendLine(`[E2EEService] Fetching security status...`);
        const status = await api.getSecurityStatus();
        outputChannel.appendLine(`[E2EEService] Security status fetched: ${JSON.stringify(status ? { setup_complete: status.setup_complete, has_profile: !!status.e2ee_profile } : null)}`);

        if (!status || !status.setup_complete || !status.e2ee_profile) {
            outputChannel.appendLine(`[E2EEService] Error: Security setup is incomplete or profile is missing!`);
            return false;
        }

        try {
            outputChannel.appendLine(`[E2EEService] Unwrapping private key...`);
            const privateKey = await this.unlockWithPassword(password, status.e2ee_profile);
            outputChannel.appendLine(`[E2EEService] Private key unwrapped successfully!`);

            await this.storePrivateKey(privateKey);
            await this.context.secrets.store('sniphive.masterPassword.' + email, password);
            outputChannel.appendLine(`[E2EEService] Private key stored successfully.`);
            return true;
        } catch (e: any) {
            outputChannel.appendLine(`[E2EEService] Unlock error: ${e.message}`);
            if (e.stack) {
                outputChannel.appendLine(`[E2EEService] Stack trace: ${e.stack}`);
            }
            return false;
        }
    }

    async setupE2EE(password: string): Promise<{ success: boolean; recoveryCodes?: string[]; message?: string }> {
        try {
            const salt = generateSalt();
            const recoverySalt = generateSalt();
            const iterations = 600000;

            const keyPair = await RSA.generateKeyPair();
            const wrappingKey = await deriveKey(password, salt, iterations);

            const privateKeyJwk = await RSA.exportPrivateKeyToJWK(keyPair.privateKey);
            const enc = new TextEncoder();
            const { ciphertext, iv } = await AES.encryptWithAESKey(
                wrappingKey,
                JSON.stringify(privateKeyJwk)
            );

            const recoveryKey = await deriveKey(password, recoverySalt, iterations, 256);
            const { ciphertext: recoveryCipher, iv: recoveryIv } = await AES.encryptWithAESKey(
                recoveryKey,
                JSON.stringify(privateKeyJwk)
            );

            const publicKeyJwk = await RSA.exportPublicKeyToJWK(keyPair.publicKey);

            const payload = {
                public_key_jwk: JSON.stringify(publicKeyJwk),
                encrypted_private_key: RSA.arrayBufferToBase64(ciphertext),
                recovery_encrypted_private_key: RSA.arrayBufferToBase64(recoveryCipher),
                private_key_iv: RSA.arrayBufferToBase64(iv.buffer as ArrayBuffer),
                recovery_iv: RSA.arrayBufferToBase64(recoveryIv.buffer as ArrayBuffer),
                kdf_salt: RSA.arrayBufferToBase64(salt.buffer as ArrayBuffer),
                recovery_salt: RSA.arrayBufferToBase64(recoverySalt.buffer as ArrayBuffer),
                kdf_iterations: iterations,
            };

            const api = SnipHiveApiService.getInstance();
            const ok = await api.setupE2EE(payload);
            if (ok) {
                this.privateKey = keyPair.privateKey;
                await this.storePrivateKey(keyPair.privateKey);
                const email = SnipHiveAuthService.getInstance().getUserEmail();
                if (email) {
                    await this.context.secrets.store('sniphive.masterPassword.' + email, password);
                }
                return { success: true };
            }
            return { success: false, message: 'E2EE setup failed on server' };
        } catch (e: any) {
            return { success: false, message: e.message };
        }
    }

    async recoverWithCode(recoveryCode: string): Promise<boolean> {
        const api = SnipHiveApiService.getInstance();
        const result = await api.recoverE2EE(recoveryCode);
        if (!result) return false;

        const {
            encrypted_private_key,
            private_key_iv,
            kdf_salt,
            kdf_iterations,
            recovery_salt,
            recovery_iv,
            recovery_encrypted_private_key
        } = result;

        const saltSource = recovery_salt || kdf_salt;
        const ivSource = recovery_iv || private_key_iv;
        const encryptedKeySource = recovery_encrypted_private_key || encrypted_private_key;

        const salt = RSA.base64ToArrayBuffer(saltSource);
        const recoveryKey = await deriveKey(recoveryCode, new Uint8Array(salt), kdf_iterations);

        const encryptedPrivateKey = RSA.base64ToArrayBuffer(encryptedKeySource);
        const iv = new Uint8Array(RSA.base64ToArrayBuffer(ivSource));

        try {
            const decryptedBytes = await crypto.subtle.decrypt(
                { name: 'AES-GCM', iv: iv as BufferSource },
                recoveryKey,
                encryptedPrivateKey
            );
            const jwkString = new TextDecoder().decode(decryptedBytes);
            const jwk = JSON.parse(jwkString);

            const usages: KeyUsage[] = jwk.key_ops || ['decrypt'];
            const privateKey = await crypto.subtle.importKey(
                'jwk',
                jwk,
                { name: 'RSA-OAEP', hash: 'SHA-256' },
                true,
                usages
            );

            await this.storePrivateKey(privateKey);
            return true;
        } catch (e: any) {
            outputChannel.appendLine(`[E2EEService] recoverWithCode failed: ${e.message}`);
            return false;
        }
    }

    async encryptContent(plaintext: string): Promise<{ encryptedContent: string; encryptedDEK: string; iv: string; contentIv: string } | null> {
        try {
            const privateKey = await this.getPrivateKey();
            if (!privateKey) return null;

            const publicKeyJwk = await RSA.exportPublicKeyToJWK(privateKey);
            const publicKey = await RSA.importPublicKeyFromJWK(publicKeyJwk);

            const result = await Envelope.sealEnvelope(plaintext, publicKey);
            return {
                encryptedContent: result.encryptedContent,
                encryptedDEK: result.encryptedDEK,
                iv: '',
                contentIv: '',
            };
        } catch (e: any) {
            outputChannel.appendLine(`Encrypt error: ${e.message}`);
            return null;
        }
    }

    async decryptContent(encryptedContent: string, encryptedDEK: string, iv: string, contentIv: string): Promise<string | null> {
        try {
            const privateKey = await this.getPrivateKey();
            if (!privateKey) return null;
            return Envelope.openEnvelope(encryptedContent, encryptedDEK, privateKey);
        } catch (e: any) {
            outputChannel.appendLine(`Decrypt error: ${e.message}`);
            return null;
        }
    }

    isUnlocked(): boolean {
        return this.privateKey !== null;
    }

    clearPrivateKey() {
        this.privateKey = null;
    }
}
