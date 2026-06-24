import React, { useEffect, useRef, useCallback } from 'react';
import { useSelector } from 'react-redux';
import MessageBubble from '../components/MessageBubble';
import MessageInput  from '../components/MessageInput';
import { useChat }   from '../hooks/useChat';

function TypingIndicator({ users }) {
  if (!users.length) return null;
  return (
    <div className="flex justify-start mb-2 px-4">
      <div className="bg-gray-700 rounded-2xl px-4 py-2 text-gray-400 text-sm italic">
        typing…
      </div>
    </div>
  );
}

export default function ChatWindow({ currentUserId }) {
  const activeConversationId = useSelector((s) => s.chat.activeConversationId);
  const conversations        = useSelector((s) => s.chat.conversations);
  const conversation         = conversations.find((c) => c._id === activeConversationId);

  const {
    messages,
    typingUsers,
    aesKey,
    sendMessage,
    decryptMsg,
    emitTypingStart,
    emitTypingStop,
  } = useChat(activeConversationId);

  const bottomRef = useRef(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = useCallback(
    (text) => sendMessage(text),
    [sendMessage]
  );

  const getOtherParticipant = () =>
    conversation?.participants?.find((p) => p._id !== currentUserId);

  if (!activeConversationId) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-900 text-gray-500">
        <div className="text-center">
          <div className="text-5xl mb-4">💬</div>
          <p className="text-lg">Select a conversation to start chatting</p>
          <p className="text-sm mt-1 text-gray-600">End-to-end encrypted</p>
        </div>
      </div>
    );
  }

  const other       = getOtherParticipant();
  const displayName = conversation?.isGroup
    ? conversation.groupName
    : other?.username || 'Unknown';

  return (
    <div className="flex flex-col h-full bg-gray-900">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-gray-800 border-b border-gray-700 shadow">
        <div className="relative">
          <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold">
            {displayName?.[0]?.toUpperCase()}
          </div>
          {other?.isOnline && (
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-gray-800" />
          )}
        </div>
        <div>
          <p className="text-white font-semibold leading-tight">{displayName}</p>
          <p className="text-xs text-gray-400">
            {other?.isOnline
              ? 'Online'
              : other?.lastSeen
              ? `Last seen ${new Date(other.lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
              : ''}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <span className="text-xs text-emerald-400">🔒 E2E Encrypted</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1">
        {!aesKey && (
          <div className="text-center text-yellow-500 text-sm py-2">
            ⚠️ Setting up encryption keys…
          </div>
        )}
        {messages.map((msg) => (
          <MessageBubble
            key={msg._id}
            message={msg}
            isMine={msg.sender?._id === currentUserId || msg.sender === currentUserId}
            decryptMsg={decryptMsg}
          />
        ))}
        <TypingIndicator users={typingUsers} />
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <MessageInput
        onSend={handleSend}
        onTypingStart={emitTypingStart}
        onTypingStop={emitTypingStop}
      />
    </div>
  );
}