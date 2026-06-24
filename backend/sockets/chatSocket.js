const Message      = require('../models/Message');
const Conversation = require('../models/Conversation');
const User         = require('../models/User');

// Map: userId (string) -> Set of socketIds
const onlineUsers = new Map();

module.exports = (io) => {
  io.on('connection', (socket) => {
    const userId = socket.handshake.auth?.userId;
    if (!userId) return socket.disconnect();

    // ── Register user online ──────────────────────────────────────────
    if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
    onlineUsers.get(userId).add(socket.id);

    User.findByIdAndUpdate(userId, { isOnline: true }).exec();
    io.emit('user:online', { userId });

    // ── Join all conversation rooms ───────────────────────────────────
    socket.on('conversations:join', (conversationIds = []) => {
      conversationIds.forEach((id) => socket.join(`conv:${id}`));
    });

    // ── Send message ──────────────────────────────────────────────────
    // Client emits this AFTER the REST POST /api/messages succeeds,
    // passing the saved message object so all room members get it live.
    socket.on('message:send', async (message) => {
      try {
        // Broadcast to everyone in the room EXCEPT sender
        socket.to(`conv:${message.conversationId}`).emit('message:receive', message);

        // Mark as delivered for participants who are online
        const conv = await Conversation.findById(message.conversationId);
        if (!conv) return;

        conv.participants.forEach((pId) => {
          const pid = pId.toString();
          if (pid !== userId && onlineUsers.has(pid)) {
            Message.findByIdAndUpdate(message._id, { status: 'delivered' }).exec();
            // Notify sender of delivery
            onlineUsers.get(userId)?.forEach((sid) =>
              io.to(sid).emit('message:delivered', { messageId: message._id })
            );
          }
        });
      } catch (err) {
        console.error('message:send socket error:', err);
      }
    });

    // ── Typing indicators ─────────────────────────────────────────────
    socket.on('typing:start', ({ conversationId }) => {
      socket.to(`conv:${conversationId}`).emit('typing:start', { userId, conversationId });
    });

    socket.on('typing:stop', ({ conversationId }) => {
      socket.to(`conv:${conversationId}`).emit('typing:stop', { userId, conversationId });
    });

    // ── Mark messages read ────────────────────────────────────────────
    socket.on('messages:read', async ({ conversationId, messageIds }) => {
      try {
        await Message.updateMany(
          { _id: { $in: messageIds }, status: { $ne: 'read' } },
          {
            status: 'read',
            $addToSet: { readBy: { user: userId, readAt: new Date() } },
          }
        );

        socket
          .to(`conv:${conversationId}`)
          .emit('messages:read', { userId, messageIds, conversationId });
      } catch (err) {
        console.error('messages:read error:', err);
      }
    });

    // ── Disconnect ────────────────────────────────────────────────────
    socket.on('disconnect', () => {
      const sockets = onlineUsers.get(userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          onlineUsers.delete(userId);
          const lastSeen = new Date();
          User.findByIdAndUpdate(userId, {
            isOnline: false,
            lastSeen,
          }).exec();
          io.emit('user:offline', { userId, lastSeen });
        }
      }
    });
  });
};