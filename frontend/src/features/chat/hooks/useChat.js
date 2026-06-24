import { useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { sendMessage as sendMessageThunk, fetchMessages } from '../store/chatSlice';
import { encryptMessage, decryptMessage } from '../../../lib/crypto/e2eEncryption';
import { getSocket } from './useSocket';

export function useChat(conversationId) {
  const dispatch      = useDispatch();
  const aesKeys       = useSelector((s) => s.chat.aesKeys);
  const messages      = useSelector((s) => s.chat.messages[conversationId] || []);
  const typingUsers   = useSelector((s) => s.chat.typingUsers[conversationId] || []);
  const aesKey        = aesKeys[conversationId];
  const typingTimeout = useRef(null);

  // Send an encrypted message
  const sendMessage = useCallback(
    async (plaintext, replyTo = null) => {
      if (!aesKey || !plaintext.trim()) return;

      const { encryptedContent, iv } = await encryptMessage(plaintext, aesKey);

      const savedMessage = await dispatch(
        sendMessageThunk({ conversationId, encryptedContent, iv, replyTo })
      ).unwrap();

      // Emit via socket so other users get it instantly
      const socket = getSocket();
      if (socket) socket.emit('message:send', savedMessage);

      return savedMessage;
    },
    [aesKey, conversationId, dispatch]
  );

  // Decrypt a single message
  const decryptMsg = useCallback(
    async (message) => {
      if (!aesKey) return '[Key not available]';
      return decryptMessage(message.encryptedContent, message.iv, aesKey);
    },
    [aesKey]
  );

  // Typing indicator helpers
  const emitTypingStart = useCallback(() => {
    const socket = getSocket();
    if (!socket) return;
    socket.emit('typing:start', { conversationId });
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      socket.emit('typing:stop', { conversationId });
    }, 2000);
  }, [conversationId]);

  const emitTypingStop = useCallback(() => {
    clearTimeout(typingTimeout.current);
    getSocket()?.emit('typing:stop', { conversationId });
  }, [conversationId]);

  const loadMoreMessages = useCallback(
    (page) => dispatch(fetchMessages({ conversationId, page })),
    [conversationId, dispatch]
  );

  return {
    messages,
    typingUsers,
    aesKey,
    sendMessage,
    decryptMsg,
    emitTypingStart,
    emitTypingStop,
    loadMoreMessages,
  };
}