const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/auth');
const {
  getMessages,
  sendMessage,
  updateMessageStatus,
  deleteMessage,
} = require('../controllers/messageController');

router.get('/:conversationId', auth, getMessages);
router.post('/', auth, sendMessage);
router.patch('/:messageId/status', auth, updateMessageStatus);
router.delete('/:messageId', auth, deleteMessage);

module.exports = router;