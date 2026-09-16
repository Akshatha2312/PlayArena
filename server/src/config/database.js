const mongoose = require('mongoose');
const dns = require('dns');

// Fix DNS resolution issues on Windows for MongoDB SRV records
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
  // Ignore DNS set error
}

const connectDB = async () => {
  const primaryUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/play_arena';
  const localFallbackUri = 'mongodb://127.0.0.1:27017/play_arena';

  try {
    const conn = await mongoose.connect(primaryUri, { serverSelectionTimeoutMS: 3000 });
    console.log(`[Database] MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.warn(`[Database Warning] Primary connection failed: ${error.message}`);
    if (primaryUri !== localFallbackUri) {
      try {
        console.log('[Database] Attempting connection to local MongoDB fallback...');
        const connFallback = await mongoose.connect(localFallbackUri, { serverSelectionTimeoutMS: 2000 });
        console.log(`[Database] MongoDB Local Fallback Connected: ${connFallback.connection.host}`);
        return;
      } catch (localErr) {
        console.warn(`[Database Warning] Local MongoDB fallback connection also failed: ${localErr.message}`);
      }
    }
    mongoose.set('bufferCommands', false);
    console.log('[Database Notice] Express server running with unbuffered Mongoose mode (offline/simulation fallback active).');
  }
};

module.exports = connectDB;
