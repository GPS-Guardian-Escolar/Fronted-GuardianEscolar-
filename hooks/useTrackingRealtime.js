import { useEffect, useRef } from 'react';
import { createTrackingSocket } from '../services/socket';

export function useTrackingRealtime(tripId, { onCoordinate, onError } = {}) {
  const callbacks = useRef({ onCoordinate, onError });

  useEffect(() => {
    callbacks.current = { onCoordinate, onError };
  }, [onCoordinate, onError]);

  useEffect(() => {
    if (!tripId) return undefined;

    let disposed = false;
    let client;

    createTrackingSocket({
      tripId,
      onCoordinate: (point) => callbacks.current.onCoordinate?.(point),
      onError: (error) => callbacks.current.onError?.(error),
    }).then((connectedClient) => {
      if (disposed) {
        connectedClient.deactivate();
      } else {
        client = connectedClient;
      }
    }).catch((error) => {
      if (!disposed) callbacks.current.onError?.(error);
    });

    return () => {
      disposed = true;
      client?.deactivate();
    };
  }, [tripId]);
}