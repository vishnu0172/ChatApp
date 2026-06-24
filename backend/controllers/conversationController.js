const Conversation = require('../models/Conversation');
const User = require('../models/User');

// GET /api/conversations  — list all conversations for logged-in user
exports.getConversations = async (req, res) => {
  try {
    const conversations = await Conversation.find({
      participants: req.user._id,
    })
      .populate('participants', 'username avatar isOnline lastSeen publicKey')
      .populate({
        path: 'lastMessage',
        populate: { path: 'sender', select: 'username' },
      })
      .sort({ updatedAt: -1 });

    res.json(conversations);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/conversations  — create or get existing DM
exports.createOrGetConversation = async (req, res) => {
  try {
    const { participantId } = req.body;
    const me = req.user._id;

    if (!participantId) {
      return res.status(400).json({ message: 'participantId required' });
    }

    // Check if DM already exists
    let conversation = await Conversation.findOne({
      isGroup: false,
      participants: { $all: [me, participantId], $size: 2 },
    }).populate('participants', 'username avatar isOnline lastSeen publicKey');

    if (conversation) return res.json(conversation);

    // Create new DM conversation
    conversation = await Conversation.create({
      participants: [me, participantId],
      isGroup: false,
    });

    await conversation.populate('participants', 'username avatar isOnline lastSeen publicKey');
    res.status(201).json(conversation);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// PATCH /api/conversations/:id/keys  — store encrypted AES key for a user
exports.storeEncryptedKey = async (req, res) => {
  try {
    const { id } = req.params;
    const { encryptedKey } = req.body; // AES key encrypted with user's RSA public key

    await Conversation.findByIdAndUpdate(id, {
      [`encryptedKeys.${req.user._id}`]: encryptedKey,
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};