// Add to your existing Express app setup:
const messageRoutes      = require('./routes/messages');
const conversationRoutes = require('./routes/conversations');
const chatSocket         = require('./sockets/chatSocket');

// REST routes
app.use('/api/messages',      messageRoutes);
app.use('/api/conversations', conversationRoutes);

// Socket.IO  (assuming `io` is your socket.io instance)
chatSocket(io);
// Install: npm install socket.io cors dotenv
const { createServer } = require('http');
const { Server }       = require('socket.io');

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: 'http://localhost:5173', credentials: true }
});

require('./sockets/chatSocket')(io);
httpServer.listen(5000);npm install socket.io-client axios @reduxjs/toolkit react-redux