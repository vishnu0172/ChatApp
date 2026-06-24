import { useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { io } from 'socket.io-client';
import {
  receiveMessage,
  setTyping,
  setUserOnline,
  markMessagesRead,
  messageDelivered,
} from '../store/chatSlice';

let socketInstance = null;

export function useSocket(userId, conversationIds = []) {
  const dispatch   = useDispatch();
  const socketRef  = useRef(null);

  useEffect(() => {
    if (!userId) return;

    // Singleton socket
    if (!socketInstance) {
      socketInstance = io(import.meta.env.VITE_API_URL || 'http://localhost:5000', {
        auth: { userId },
        transports: ['websocket'],
      });
    }
    socketRef.current = socketInstance;
    const socket = socketRef.current;

    // Join conversation rooms
    if (conversationIds.length) {
      socket.emit('conversations:join', conversationIds);
    }

    socket.on('message:receive',   (msg)  => dispatch(receiveMessage(msg)));
    socket.on('message:delivered', (data) => dispatch(messageDelivered(data)));
    socket.on('messages:read',     (data) => dispatch(markMessagesRead(data)));
    socket.on('typing:start',      (data) => dispatch(setTyping({ ...data, isTyping: true  })));
    socket.on('typing:stop',       (data) => dispatch(setTyping({ ...data, isTyping: false })));
    socket.on('user:online',  ({ userId: uid }) =>
      dispatch(setUserOnline({ userId: uid, isOnline: true }))
    );
    socket.on('user:offline', ({ userId: uid, lastSeen }) =>
      dispatch(setUserOnline({ userId: uid, isOnline: false, lastSeen }))
    );

    return () => {
      socket.off('message:receive');
      socket.off('message:delivered');
      socket.off('messages:read');
      socket.off('typing:start');
      socket.off('typing:stop');
      socket.off('user:online');
      socket.off('user:offline');
    };
  }, [userId, JSON.stringify(conversationIds)]);

  return socketRef;
}

export function getSocket() {
  return socketInstance;
}