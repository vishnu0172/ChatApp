import React, { useEffect, useState } from 'react';

function formatTime(date) {
  return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function StatusTick({ status }) {
  if (status === 'read')      return <span className="text-blue-400 text-xs">✓✓</span>;
  if (status === 'delivered') return <span className="text-gray-400 text-xs">✓✓</span>;
  return <span className="text-gray-500 text-xs">✓</span>;
}

export default function MessageBubble({ message, isMine, decryptMsg }) {
  const [text, setText] = useState('');

  useEffect(() => {
    let cancelled = false;
    decryptMsg(message).then((t) => { if (!cancelled) setText(t); });
    return () => { cancelled = true; };
  }, [message, decryptMsg]);

  return (
    <div className={`flex ${isMine ? 'justify-end' : 'justify-start'} mb-1`}>
      <div
        className={`max-w-xs lg:max-w-md px-3 py-2 rounded-2xl shadow
          ${isMine
            ? 'bg-emerald-600 text-white rounded-br-sm'
            : 'bg-gray-700 text-gray-100 rounded-bl-sm'
          }`}
      >
        {!isMine && (
          <p className="text-xs text-emerald-400 font-semibold mb-0.5">
            {message.sender?.username}
          </p>
        )}
        <p className="text-sm leading-relaxed break-words">{text || '…'}</p>
        <div className={`flex items-center gap-1 mt-0.5 ${isMine ? 'justify-end' : 'justify-start'}`}>
          <span className="text-xs opacity-60">{formatTime(message.createdAt)}</span>
          {isMine && <StatusTick status={message.status} />}
        </div>
      </div>
    </div>
  );
}