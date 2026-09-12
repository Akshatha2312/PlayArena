require('dotenv').config();

const app = require('./app');
const connectDB = require('./config/database');

const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Connect to MongoDB Database
connectDB();

// Start HTTP Server Listener
const server = app.listen(PORT, () => {
  console.log(`[Play Arena Server] Running in ${NODE_ENV} mode on http://localhost:${PORT}`);
});
