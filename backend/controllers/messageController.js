const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const mongoose = require('mongoose');

// GET /api/messages/:conversationId?page=1&limit=30
exports.getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 30;
    const skip  = (page - 1) * limit;

    // Verify user is participant
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: req.user._id,
    });
    if (!conversation) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const messages = await Message.find({
      conversationId,
      deletedFor: { $nin: [req.user._id] },
      isDeleted: false,
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('sender', 'username avatar')
      .populate('replyTo', 'encryptedContent sender iv');

    res.json({
      messages: messages.reverse(),
      page,
      hasMore: messages.length === limit,
    });
  } catch (err) {
    console.error('getMessages error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/messages
exports.sendMessage = async (req, res) => {
  try {
    const {
      conversationId,
      encryptedContent,
      iv,
      messageType = 'text',
      replyTo = null,
    } = req.body;

    if (!conversationId || !encryptedContent || !iv) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: req.user._id,
    });
    if (!conversation) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const message = await Message.create({
      conversationId,
      sender: req.user._id,
      encryptedContent,
      iv,
      messageType,
      replyTo,
    });

    // Update lastMessage on conversation
    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: message._id,
    });

    const populated = await message.populate('sender', 'username avatar');

    res.status(201).json(populated);
  } catch (err) {
    console.error('sendMessage error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// PATCH /api/messages/:messageId/status
exports.updateMessageStatus = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { status } = req.body; // 'delivered' | 'read'

    const message = await Message.findByIdAndUpdate(
      messageId,
      {
        status,
        ...(status === 'read'
          ? {
              $addToSet: {
                readBy: { user: req.user._id, readAt: new Date() },
              },
            }
          : {}),
      },
      { new: true }
    );

    res.json(message);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// DELETE /api/messages/:messageId
exports.deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { deleteFor } = req.query; // 'me' | 'everyone'

    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ message: 'Not found' });

    if (deleteFor === 'everyone') {
      if (message.sender.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Not authorized' });
      }
      message.isDeleted = true;
    } else {
      message.deletedFor.push(req.user._id);
    }

    await message.save();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};