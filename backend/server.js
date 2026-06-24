require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { createServer } = require('http');
const { Server } = require('socket.io');

const messageRoutes = require('./routes/message');
const conversationRoutes = require('./routes/conversation');
const chatSocket = require('./sockets/chatSocket');

const app = express();
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: 'http://localhost:5173', credentials: true }
});

// REST routes
app.use('/api/messages', messageRoutes);
app.use('/api/conversations', conversationRoutes);

// Socket.IO
chatSocket(io);

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/chatapp';

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    httpServer.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch(err => console.error('MongoDB connection error:', err));
