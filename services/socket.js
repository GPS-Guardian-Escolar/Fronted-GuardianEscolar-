import { Client } from '@stomp/stompjs';
import { WS_URL } from '../config/endpoints';
import { storage } from '../utils/storage';

export const createTrackingSocket = async ({ tripId, onCoordinate, onError }) => {
  const token = await storage.getToken();
  const client = new Client({
    brokerURL: WS_URL.replace(/^http/, 'ws'),
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
