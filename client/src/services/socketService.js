let ioClient = typeof window !== 'undefined' && window.io ? window.io : null;

class ClientSocketManager {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
  }

  connect(token) {
    if (this.socket) return this.socket;

    const authToken = token || localStorage.getItem('play_arena_token');
    if (!authToken || !ioClient) {
      return null;
    }

    try {
      this.socket = ioClient({
        auth: { token: authToken },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
      });

      this.socket.on('connect', () => {
        console.log('[ClientSocket] Connected to server:', this.socket.id);
      });

      this.socket.on('connect_error', (err) => {
        console.warn('[ClientSocket] Connection error:', err.message);
      });

      return this.socket;
    } catch (e) {
      console.warn('[ClientSocket] Failed to initialize socket:', e.message);
      return null;
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  subscribe(eventName, callback) {
    if (this.socket) {
      this.socket.on(eventName, callback);
    }
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, new Set());
    }
    this.listeners.get(eventName).add(callback);

    return () => this.unsubscribe(eventName, callback);
  }

  unsubscribe(eventName, callback) {
    if (this.socket) {
      this.socket.off(eventName, callback);
    }
    if (this.listeners.has(eventName)) {
      this.listeners.get(eventName).delete(callback);
    }
  }

  joinBooking(bookingId) {
    if (this.socket && bookingId) {
      this.socket.emit('join_booking', { bookingId });
    }
  }

  leaveBooking(bookingId) {
    if (this.socket && bookingId) {
      this.socket.emit('leave_booking', { bookingId });
    }
  }
}

export const socketService = new ClientSocketManager();
