'use client';

/**
 * WebSocket 连接管理 Hook
 *
 * 功能：
 * - 自动连接/断线重连（指数退避，最多5次）
 * - JSON 消息收发 + 二进制音频帧发送
 * - 连接未就绪时消息自动排队缓存
 */
import { useRef, useState, useCallback, useEffect } from 'react';
import type { ServerMessage, ClientMessage } from '../types';

interface UseWebSocketOptions {
  url?: string;
  onMessage?: (msg: ServerMessage) => void;
  autoConnect?: boolean;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const defaultUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8766/ws';
  const { url = defaultUrl, onMessage, autoConnect = false } = options;
  const wsRef = useRef<WebSocket | null>(null);
  // 用 ref 存储回调，避免 connect 依赖变化导致 useEffect 重新执行关闭连接
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;
  const [connected, setConnected] = useState(false);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>();
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const pendingQueue = useRef<(string | ArrayBuffer)[]>([]);

  /** 建立 WebSocket 连接 */
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      reconnectAttempts.current = 0;
      while (pendingQueue.current.length > 0) {
        const msg = pendingQueue.current.shift()!;
        ws.send(msg);
      }
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as ServerMessage;
        onMessageRef.current?.(msg);  // 通过 ref 调用，始终指向最新回调
      } catch {
        // 二进制帧或非法 JSON
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
  }, [url]);  // 只依赖 url，不依赖 onMessage

  /** 断开连接并停止重连 */
  const disconnect = useCallback(() => {
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current);
    }
    reconnectAttempts.current = maxReconnectAttempts;
    wsRef.current?.close();
    setConnected(false);
  }, []);

  /** 发送 JSON 控制消息 */
  const send = useCallback((msg: ClientMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    } else {
      pendingQueue.current.push(JSON.stringify(msg));
    }
  }, []);

  /** 发送二进制音频帧 */
  const sendBinary = useCallback((data: ArrayBuffer) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(data);
    } else {
      pendingQueue.current.push(data);
    }
  }, []);

  // autoConnect 模式下自动建立连接
  useEffect(() => {
    if (autoConnect) connect();
  }, [autoConnect, connect]);

  // 组件卸载时断开
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return { connected, connect, disconnect, send, sendBinary };
}
