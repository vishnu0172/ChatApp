const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/auth');
const {
  getConversations,
  createOrGetConversation,
  storeEncryptedKey,
} = require('../controllers/conversationController');

router.get('/', auth, getConversations);
router.post('/', auth, createOrGetConversation);
router.patch('/:id/keys', auth, storeEncryptedKey);

module.exports = router;