'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import type { ServerMessage, ClientMessage } from '../types';

interface UseWebSocketOptions {
  url?: string;
  onMessage?: (msg: ServerMessage) => void;
  autoConnect?: boolean;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const { url = 'ws://localhost:8765/ws', onMessage, autoConnect = false } = options;
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>();
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      reconnectAttempts.current = 0;
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as ServerMessage;
        onMessage?.(msg);
      } catch {
        // binary frame or invalid JSON
      }
    };

    ws.onclose = () => {
      setConnected(false);
      if (reconnectAttempts.current < maxReconnectAttempts) {
        const delay = Math.min(1000 * 2 ** reconnectAttempts.current, 30000);
        reconnectTimer.current = setTimeout(connect, delay);
        reconnectAttempts.current++;
      }
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [url, onMessage]);

  const disconnect = useCallback(() => {
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current);
    }
    reconnectAttempts.current = maxReconnectAttempts;
    wsRef.current?.close();
    setConnected(false);
  }, []);

  const send = useCallback((msg: ClientMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  const sendBinary = useCallback((data: ArrayBuffer) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(data);
    }
  }, []);

  useEffect(() => {
    if (autoConnect) connect();
    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  return { connected, connect, disconnect, send, sendBinary };
}
