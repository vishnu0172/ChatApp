import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as chatAPI from '../services/chatAPI';

// ─── Async Thunks ─────────────────────────────────────────────────────────────

export const fetchConversations = createAsyncThunk(
  'chat/fetchConversations',
  async (_, { rejectWithValue }) => {
    try {
      return await chatAPI.getConversations();
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed');
    }
  }
);

export const fetchMessages = createAsyncThunk(
  'chat/fetchMessages',
  async ({ conversationId, page = 1 }, { rejectWithValue }) => {
    try {
      const data = await chatAPI.getMessages(conversationId, page);
      return { ...data, conversationId };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed');
    }
  }
);

export const sendMessage = createAsyncThunk(
  'chat/sendMessage',
  async (messageData, { rejectWithValue }) => {
    try {
      return await chatAPI.sendMessage(messageData);
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed');
    }
  }
);

export const createOrGetConversation = createAsyncThunk(
  'chat/createOrGetConversation',
  async (participantId, { rejectWithValue }) => {
    try {
      return await chatAPI.createOrGetConversation(participantId);
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed');
    }
  }
);

// ─── Slice ────────────────────────────────────────────────────────────────────

const chatSlice = createSlice({
  name: 'chat',
  initialState: {
    conversations:        [],        // list of conversations
    activeConversationId: null,      // currently open conversation
    messages:             {},        // { [conversationId]: Message[] }
    typingUsers:          {},        // { [conversationId]: Set of userIds }
    onlineUsers:          new Set(),
    aesKeys:              {},        // { [conversationId]: CryptoKey } — in memory only
    loading:              false,
    messagesLoading:      false,
    error:                null,
  },

  reducers: {
    setActiveConversation(state, action) {
      state.activeConversationId = action.payload;
    },
    receiveMessage(state, action) {
      const msg  = action.payload;
      const cid  = msg.conversationId;
      if (!state.messages[cid]) state.messages[cid] = [];

      // Avoid duplicates
      const exists = state.messages[cid].some((m) => m._id === msg._id);
      if (!exists) state.messages[cid].push(msg);

      // Update lastMessage in conversation list
      const conv = state.conversations.find((c) => c._id === cid);
      if (conv) conv.lastMessage = msg;
    },
    setTyping(state, action) {
      const { conversationId, userId, isTyping } = action.payload;
      if (!state.typingUsers[conversationId]) state.typingUsers[conversationId] = [];
      if (isTyping) {
        if (!state.typingUsers[conversationId].includes(userId))
          state.typingUsers[conversationId].push(userId);
      } else {
        state.typingUsers[conversationId] = state.typingUsers[conversationId].filter(
          (id) => id !== userId
        );
      }
    },
    setUserOnline(state, action) {
      const { userId, isOnline, lastSeen } = action.payload;
      const conv = state.conversations.find((c) =>
        c.participants?.some((p) => p._id === userId)
      );
      if (conv) {
        const participant = conv.participants.find((p) => p._id === userId);
        if (participant) {
          participant.isOnline = isOnline;
          if (lastSeen) participant.lastSeen = lastSeen;
        }
      }
    },
    setAESKey(state, action) {
      const { conversationId, key } = action.payload;
      state.aesKeys[conversationId] = key;
    },
    markMessagesRead(state, action) {
      const { conversationId, messageIds } = action.payload;
      const msgs = state.messages[conversationId] || [];
      msgs.forEach((m) => {
        if (messageIds.includes(m._id)) m.status = 'read';
      });
    },
    messageDelivered(state, action) {
      const { messageId } = action.payload;
      for (const cid in state.messages) {
        const msg = state.messages[cid].find((m) => m._id === messageId);
        if (msg) { msg.status = 'delivered'; break; }
      }
    },
  },

  extraReducers: (builder) => {
    builder
      // Conversations
      .addCase(fetchConversations.pending, (s) => { s.loading = true; })
      .addCase(fetchConversations.fulfilled, (s, a) => {
        s.loading = false;
        s.conversations = a.payload;
      })
      .addCase(fetchConversations.rejected, (s, a) => {
        s.loading = false;
        s.error = a.payload;
      })
      // Messages
      .addCase(fetchMessages.pending, (s) => { s.messagesLoading = true; })
      .addCase(fetchMessages.fulfilled, (s, a) => {
        s.messagesLoading = false;
        const { conversationId, messages, page } = a.payload;
        if (page === 1) {
          s.messages[conversationId] = messages;
        } else {
          // Prepend older messages
          s.messages[conversationId] = [
            ...messages,
            ...(s.messages[conversationId] || []),
          ];
        }
      })
      .addCase(fetchMessages.rejected, (s, a) => {
        s.messagesLoading = false;
        s.error = a.payload;
      })
      // Send message
      .addCase(sendMessage.fulfilled, (s, a) => {
        const msg = a.payload;
        const cid = msg.conversationId;
        if (!s.messages[cid]) s.messages[cid] = [];
        s.messages[cid].push(msg);
        const conv = s.conversations.find((c) => c._id === cid);
        if (conv) conv.lastMessage = msg;
      })
      // Create conversation
      .addCase(createOrGetConversation.fulfilled, (s, a) => {
        const conv = a.payload;
        const exists = s.conversations.find((c) => c._id === conv._id);
        if (!exists) s.conversations.unshift(conv);
        s.activeConversationId = conv._id;
      });
  },
});

export const {
  setActiveConversation,
  receiveMessage,
  setTyping,
  setUserOnline,
  setAESKey,
  markMessagesRead,
  messageDelivered,
} = chatSlice.actions;

export default chatSlice.reducer;