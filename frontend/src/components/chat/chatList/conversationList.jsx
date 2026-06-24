import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchConversations, setActiveConversation } from '../store/chatSlice';
import { useCrypto } from '../hooks/useCrypto';

function formatTime(date) {
  if (!date) return '';
  const d = new Date(date);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  return isToday
    ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export default function ConversationList({ currentUserId }) {
  const dispatch      = useDispatch();
  const { conversations, activeConversationId, loading } = useSelector((s) => s.chat);
  const { setupConversationKey } = useCrypto(currentUserId);

  useEffect(() => { dispatch(fetchConversations()); }, [dispatch]);

  const handleSelect = async (conv) => {
    dispatch(setActiveConversation(conv._id));
    await setupConversationKey(conv);
  };

  const getOtherParticipant = (conv) =>
    conv.participants?.find((p) => p._id !== currentUserId);

  if (loading) return <div className="p-4 text-gray-400">Loading…</div>;

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {conversations.map((conv) => {
        const other       = getOtherParticipant(conv);
        const isActive    = conv._id === activeConversationId;
        const displayName = conv.isGroup ? conv.groupName : other?.username || 'Unknown';

        return (
          <div
            key={conv._id}
            onClick={() => handleSelect(conv)}
            className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-700 transition
              ${isActive ? 'bg-gray-700' : ''}`}
          >
            {/* Avatar */}
            <div className="relative">
              <div className="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold text-lg select-none">
                {displayName?.[0]?.toUpperCase()}
              </div>
              {other?.isOnline && (
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-gray-800" />
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-baseline">
                <span className="font-medium text-white truncate">{displayName}</span>
                <span className="text-xs text-gray-400 ml-2 shrink-0">
                  {formatTime(conv.lastMessage?.createdAt)}
                </span>
              </div>
              <p className="text-sm text-gray-400 truncate">
                {conv.lastMessage ? '🔒 Encrypted message' : 'No messages yet'}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}