import { Client } from '@stomp/stompjs';
import { WS_URL } from '../config/endpoints';
import { storage } from '../utils/storage';

const websocketTransportUrl = (url) => {
  const normalized = url.replace(/^http/, 'ws').replace(/\/+$/, '');
  return normalized.endsWith('/websocket') ? normalized : `${normalized}/websocket`;
};

export const createTrackingSocket = async ({ tripId, onCoordinate, onError }) => {
  const token = await storage.getToken();
  const client = new Client({
    // Spring exposes /ws as a SockJS endpoint. Native WebSocket clients such
    // as STOMP connect through SockJS's direct WebSocket transport path.
    brokerURL: websocketTransportUrl(WS_URL),
    connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
    reconnectDelay: 5000,
    onConnect: () => {
      client.subscribe(`/topic/trips/${tripId}/coordinates`, (message) => {
        if (!message.body) return;
        try {
          onCoordinate?.(JSON.parse(message.body));
        } catch (error) {
          onError?.(error);
        }
      });
    },
    onStompError: (frame) => onError?.(frame),
    onWebSocketError: (event) => onError?.(event),
  });

  client.activate();
  return client;
};
