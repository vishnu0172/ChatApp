const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema(
  {
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
    ],
    isGroup: {
      type: Boolean,
      default: false,
    },
    groupName: {
      type: String,
      default: null,
    },
    groupAvatar: {
      type: String,
      default: null,
    },
    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      default: null,
    },
    // Stores each participant's encrypted copy of the shared AES key
    // { userId: encryptedAESKey (encrypted with their RSA public key) }
    encryptedKeys: {
      type: Map,
      of: String,
      default: {},
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Conversation', conversationSchema);