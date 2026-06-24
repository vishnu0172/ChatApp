import React, { useEffect } from 'react';
import { useSelector }      from 'react-redux';
import ConversationList     from '../components/ConversationList';
import ChatWindow           from './ChatWindow';
import { useSocket }        from '../hooks/useSocket';
import { useCrypto }        from '../hooks/useCrypto';

export default function ChatLayout() {
  const currentUser  = useSelector((s) => s.auth.user); // adjust to your auth slice path
  const conversations = useSelector((s) => s.chat.conversations);
  const { initKeys }  = useCrypto(currentUser?._id);

  // Initialize RSA keys on mount
  useEffect(() => { initKeys(); }, [initKeys]);

  // Connect socket
  useSocket(
    currentUser?._id,
    conversations.map((c) => c._id)
  );

  return (
    <div className="flex h-screen bg-gray-900 text-white">
      {/* Sidebar */}
      <div className="w-80 border-r border-gray-700 flex flex-col">
        <div className="px-4 py-4 bg-gray-800 border-b border-gray-700">
          <h1 className="text-xl font-bold text-white">Chats</h1>
        </div>
        <ConversationList currentUserId={currentUser?._id} />
      </div>

      {/* Main window */}
      <div className="flex-1 flex flex-col">
        <ChatWindow currentUserId={currentUser?._id} />
      </div>
    </div>
  );
}