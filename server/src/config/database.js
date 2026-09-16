const mongoose = require('mongoose');
const dns = require('dns');

// Fix DNS resolution issues on Windows for MongoDB SRV records
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
  // Ignore DNS set error
}

// Mongoose Connection Event Listeners
mongoose.connection.on('connected', () => {
  console.log('[Database Event] Mongoose connection established.');
});

mongoose.connection.on('error', (err) => {
  console.error(`[Database Event] Mongoose connection error: ${err.message}`);
});

mongoose.connection.on('disconnected', () => {
  console.warn('[Database Event] Mongoose disconnected from MongoDB.');
});

const connectDB = async () => {
  const isProd = process.env.NODE_ENV === 'production';
  const primaryUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/play_arena';
  const localFallbackUri = 'mongodb://127.0.0.1:27017/play_arena';

  try {
    const conn = await mongoose.connect(primaryUri, { serverSelectionTimeoutMS: 4000 });
    console.log(`[Database] MongoDB Connected (Primary): ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.warn(`[Database Warning] Primary connection failed: ${error.message}`);

    // Fallback logic ONLY for non-production environments
    if (!isProd && primaryUri !== localFallbackUri) {
      try {
        console.log('[Database] Attempting connection to local MongoDB fallback...');
        const connFallback = await mongoose.connect(localFallbackUri, { serverSelectionTimeoutMS: 3000 });
        console.log(`[Database] MongoDB Local Fallback Connected: ${connFallback.connection.host}`);
        return connFallback;
      } catch (localErr) {
        console.warn(`[Database Warning] Local MongoDB fallback connection also failed: ${localErr.message}`);
      }
    }

    console.error('[Database Error] Unable to establish connection to any MongoDB database.');
  }
};

const isDBConnected = () => {
  return mongoose.connection.readyState === 1;
};

module.exports = { connectDB, isDBConnected };

