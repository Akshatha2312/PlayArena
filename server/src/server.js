require('dotenv').config();

const http = require('http');
const app = require('./app');
const connectDB = require('./config/database');
const validateEnv = require('./config/validateEnv');
const socketService = require('./services/socketService');

const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// 1. Validate environment configuration
validateEnv();

// 2. Connect to MongoDB Database
connectDB();

// Create HTTP Server & Attach Socket.IO Engine
const server = http.createServer(app);
socketService.initSocketServer(server);

// Start HTTP Server Listener
server.listen(PORT, () => {
  console.log(`[Play Arena Server] Running in ${NODE_ENV} mode on http://localhost:${PORT}`);
});
