import { useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  generateRSAKeyPair,
  saveKeysToStorage,
  loadKeysFromStorage,
  generateAESKey,
  encryptAESKeyWithRSA,
  decryptAESKeyWithRSA,
  importPublicKey,
} from '../../../lib/crypto/e2eEncryption';
import { setAESKey } from '../store/chatSlice';
import * as chatAPI from '../services/chatAPI';

export function useCrypto(userId) {
  const dispatch = useDispatch();

  // Initialize RSA keys for the user on first login
  const initKeys = useCallback(async () => {
    if (!userId) return;

    let keys = await loadKeysFromStorage(userId);
    if (!keys) {
      keys = await generateRSAKeyPair();
      await saveKeysToStorage(userId, keys.publicKey, keys.privateKey);
      // Upload public key to server
      const { exportPublicKey } = await import('../../../lib/crypto/e2eEncryption');
      const pubKeyString = await exportPublicKey(keys.publicKey);
      await chatAPI.updatePublicKey(pubKeyString);
    }
    return keys;
  }, [userId]);

  // Setup AES key for a conversation
  const setupConversationKey = useCallback(
    async (conversation) => {
      if (!userId) return;
      const keys = await loadKeysFromStorage(userId);
      if (!keys) return;

      const existingEncryptedKey = conversation.encryptedKeys?.[userId];

      if (existingEncryptedKey) {
        // Decrypt the stored AES key with our RSA private key
        const aesKey = await decryptAESKeyWithRSA(existingEncryptedKey, keys.privateKey);
        dispatch(setAESKey({ conversationId: conversation._id, key: aesKey }));
      } else {
        // Generate a new AES key and encrypt it for each participant
        const aesKey = await generateAESKey();
        dispatch(setAESKey({ conversationId: conversation._id, key: aesKey }));

        // Encrypt for each participant
        for (const participant of conversation.participants) {
          if (!participant.publicKey) continue;
          const rsaPubKey     = await importPublicKey(participant.publicKey);
          const encryptedKey  = await encryptAESKeyWithRSA(aesKey, rsaPubKey);
          await chatAPI.storeEncryptedKey(conversation._id, encryptedKey);
          // Note: In production store per-user key, here simplified to one call per user
        }
      }
    },
    [userId, dispatch]
  );

  return { initKeys, setupConversationKey };
}