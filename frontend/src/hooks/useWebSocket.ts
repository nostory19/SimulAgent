'use client';

/**
 * WebSocket 连接管理 Hook
 *
 * 功能：
 * - 自动连接/断线重连（指数退避，最多5次）
 * - JSON 消息收发 + 二进制音频帧发送
 * - ServerMessage 类型分发回调
 */
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

  /** 建立 WebSocket 连接 */
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      reconnectAttempts.current = 0;  // 连接成功后重置重连计数
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as ServerMessage;
        onMessage?.(msg);  // 将解析后的消息分发给外部回调
      } catch {
        // 二进制帧或非法 JSON，静默忽略
      }
    };

    ws.onclose = () => {
      setConnected(false);
      // 断线自动重连：指数退避（1s, 2s, 4s, 8s, 16s），最多30s间隔
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

  /** 断开连接并停止重连 */
  const disconnect = useCallback(() => {
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current);
    }
    reconnectAttempts.current = maxReconnectAttempts;  // 阻止后续重连
    wsRef.current?.close();
    setConnected(false);
  }, []);

  /** 发送 JSON 控制消息 */
  const send = useCallback((msg: ClientMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  /** 发送二进制音频帧（PCM float32） */
  const sendBinary = useCallback((data: ArrayBuffer) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(data);
    }
  }, []);

  // autoConnect 模式下自动建立连接
  useEffect(() => {
    if (autoConnect) connect();
    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  return { connected, connect, disconnect, send, sendBinary };
}
