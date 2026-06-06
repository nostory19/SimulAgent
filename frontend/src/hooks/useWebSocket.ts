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
  // WebSocket 地址默认匹配后端 .env 中 PORT=8765，可通过 NEXT_PUBLIC_WS_URL 环境变量或 options.url 覆盖
  const defaultUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8765/ws';
  const { url = defaultUrl, onMessage, autoConnect = false } = options;
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>();
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  // 待发送消息队列：连接建立前缓存的消息，连接成功后自动flush
  const pendingQueue = useRef<(string | ArrayBuffer)[]>([]);

  /** 建立 WebSocket 连接 */
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      reconnectAttempts.current = 0;
      // 连接成功后发送所有缓存消息
      while (pendingQueue.current.length > 0) {
        const msg = pendingQueue.current.shift()!;
        ws.send(msg);
      }
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

  /** 发送 JSON 控制消息（连接未就绪时自动排队） */
  const send = useCallback((msg: ClientMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    } else {
      pendingQueue.current.push(JSON.stringify(msg));
    }
  }, []);

  /** 发送二进制音频帧（连接未就绪时自动排队） */
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
    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  return { connected, connect, disconnect, send, sendBinary };
}
