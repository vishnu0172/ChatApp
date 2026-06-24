import React, { useState, useRef } from 'react';

export default function MessageInput({ onSend, onTypingStart, onTypingStop }) {
  const [text, setText]       = useState('');
  const [sending, setSending] = useState(false);
  const textareaRef           = useRef(null);

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    try {
      await onSend(trimmed);
      setText('');
      textareaRef.current?.focus();
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChange = (e) => {
    setText(e.target.value);
    onTypingStart?.();
  };

  return (
    <div className="flex items-end gap-2 px-4 py-3 bg-gray-800 border-t border-gray-700">
      <textarea
        ref={textareaRef}
        rows={1}
        value={text}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={onTypingStop}
        placeholder="Message"
        className="flex-1 resize-none bg-gray-700 text-white placeholder-gray-400 rounded-2xl px-4 py-2.5
          text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 max-h-32 overflow-y-auto"
      />
      <button
        onClick={handleSend}
        disabled={!text.trim() || sending}
        className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center
          hover:bg-emerald-600 transition disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
        title="Send"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-white rotate-45">
          <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
        </svg>
      </button>
    </div>
  );
}