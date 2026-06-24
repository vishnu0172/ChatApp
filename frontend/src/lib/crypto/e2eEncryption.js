/**
 * End-to-End Encryption using Web Crypto API
 *
 * Flow:
 *  1. On first login, generate RSA-OAEP key pair → upload publicKey to server
 *  2. When opening a conversation, generate an AES-GCM shared key
 *  3. Encrypt AES key with each participant's RSA public key → store on server
 *  4. To send a message: encrypt plaintext with AES key → send {encryptedContent, iv}
 *  5. To read a message: decrypt with AES key
 */

const ALGO_RSA = {
  name: 'RSA-OAEP',
  modulusLength: 2048,
  publicExponent: new Uint8Array([1, 0, 1]),
  hash: 'SHA-256',
};

const ALGO_AES = { name: 'AES-GCM', length: 256 };

// ─── RSA Key Pair ────────────────────────────────────────────────────────────

export async function generateRSAKeyPair() {
  const keyPair = await crypto.subtle.generateKey(ALGO_RSA, true, ['encrypt', 'decrypt']);
  return keyPair; // { publicKey, privateKey }
}

export async function exportPublicKey(publicKey) {
  const jwk = await crypto.subtle.exportKey('jwk', publicKey);
  return JSON.stringify(jwk);
}

export async function exportPrivateKey(privateKey) {
  const jwk = await crypto.subtle.exportKey('jwk', privateKey);
  return JSON.stringify(jwk);
}

export async function importPublicKey(jwkString) {
  const jwk = typeof jwkString === 'string' ? JSON.parse(jwkString) : jwkString;
  return crypto.subtle.importKey('jwk', jwk, ALGO_RSA, true, ['encrypt']);
}

export async function importPrivateKey(jwkString) {
  const jwk = typeof jwkString === 'string' ? JSON.parse(jwkString) : jwkString;
  return crypto.subtle.importKey('jwk', jwk, ALGO_RSA, true, ['decrypt']);
}

// ─── AES Key ─────────────────────────────────────────────────────────────────

export async function generateAESKey() {
  return crypto.subtle.generateKey(ALGO_AES, true, ['encrypt', 'decrypt']);
}

export async function encryptAESKeyWithRSA(aesKey, rsaPublicKey) {
  const raw = await crypto.subtle.exportKey('raw', aesKey);
  const encrypted = await crypto.subtle.encrypt(
    { name: 'RSA-OAEP' },
    rsaPublicKey,
    raw
  );
  return bufferToBase64(encrypted);
}

export async function decryptAESKeyWithRSA(encryptedBase64, rsaPrivateKey) {
  const encryptedBuffer = base64ToBuffer(encryptedBase64);
  const rawAES = await crypto.subtle.decrypt(
    { name: 'RSA-OAEP' },
    rsaPrivateKey,
    encryptedBuffer
  );
  return crypto.subtle.importKey('raw', rawAES, ALGO_AES, true, ['encrypt', 'decrypt']);
}

// ─── Message Encryption / Decryption ─────────────────────────────────────────

export async function encryptMessage(plaintext, aesKey) {
  const iv         = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV for AES-GCM
  const encoded    = new TextEncoder().encode(plaintext);
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, aesKey, encoded);

  return {
    encryptedContent: bufferToBase64(ciphertext),
    iv: bufferToBase64(iv),
  };
}

export async function decryptMessage(encryptedContent, ivBase64, aesKey) {
  try {
    const ciphertext = base64ToBuffer(encryptedContent);
    const iv         = base64ToBuffer(ivBase64);
    const decrypted  = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, aesKey, ciphertext);
    return new TextDecoder().decode(decrypted);
  } catch {
    return '[Unable to decrypt]';
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function bufferToBase64(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}

export function base64ToBuffer(base64) {
  const binary = atob(base64);
  const bytes  = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

// ─── LocalStorage persistence ─────────────────────────────────────────────────

export async function saveKeysToStorage(userId, publicKey, privateKey) {
  localStorage.setItem(`rsa_pub_${userId}`,  await exportPublicKey(publicKey));
  localStorage.setItem(`rsa_priv_${userId}`, await exportPrivateKey(privateKey));
}

export async function loadKeysFromStorage(userId) {
  const pub  = localStorage.getItem(`rsa_pub_${userId}`);
  const priv = localStorage.getItem(`rsa_priv_${userId}`);
  if (!pub || !priv) return null;
  return {
    publicKey:  await importPublicKey(pub),
    privateKey: await importPrivateKey(priv),
  };
}