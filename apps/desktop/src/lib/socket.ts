import { io, type Socket } from 'socket.io-client';
import { API_BASE } from './env';

export function createSocket(token: string): Socket {
  const options = {
    auth: { token },
    transports: ['websocket'] as string[],
  };

  if (API_BASE) {
    return io(API_BASE, options);
  }
  return io(options);
}
