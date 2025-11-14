import { io } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000';

let socket = null;

export const initSocket = () => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });
  }
  return socket;
};

export const getSocket = () => {
  if (!socket) {
    return initSocket();
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const joinEnvironment = (environmentId) => {
  const sock = getSocket();
  sock.emit('join_environment', environmentId);
};

export const leaveEnvironment = (environmentId) => {
  const sock = getSocket();
  sock.emit('leave_environment', environmentId);
};

export const onMetricUpdate = (callback) => {
  const sock = getSocket();
  sock.on('metric_update', callback);
};

export const onConflictDetected = (callback) => {
  const sock = getSocket();
  sock.on('conflict_detected', callback);
};

export const onBookingCompleted = (callback) => {
  const sock = getSocket();
  sock.on('booking_completed', callback);
};

export const offMetricUpdate = () => {
  const sock = getSocket();
  sock.off('metric_update');
};

export const offConflictDetected = () => {
  const sock = getSocket();
  sock.off('conflict_detected');
};

export const offBookingCompleted = () => {
  const sock = getSocket();
  sock.off('booking_completed');
};
