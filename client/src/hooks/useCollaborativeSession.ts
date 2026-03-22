import { useState, useEffect, useRef, useCallback } from 'react';
import { getCollabToken, getCollabSession } from '../lib/collabAuth';
import { getAuthToken } from '../lib/auth';
import type { JurorResponse } from '../types';

export type ConnectionStatus = 'connecting' | 'connected' | 'reconnecting' | 'disconnected';

interface CollabEvent {
  type: string;
  seq?: number;
  data?: any;
  timestamp?: number;
}

interface QueuedWrite {
  type: 'response' | 'followup' | 'notes';
  payload: any;
  id: string;
}

interface UseCollaborativeSessionOptions {
  sessionId: string | null;
  isOwner: boolean;
  onResponseNew?: (data: any) => void;
  onFollowUpNew?: (data: any) => void;
  onNotesUpdated?: (data: any) => void;
  onParticipantJoined?: (data: any) => void;
  onParticipantLeft?: (data: any) => void;
  onPhaseChanged?: (data: any) => void;
  onResponseDeleted?: (data: any) => void;
  onDuplicate?: (data: any) => void;
  onSessionRevoked?: () => void;
  onTypingStart?: (data: any) => void;
  onTypingStop?: (data: any) => void;
}

export function useCollaborativeSession(options: UseCollaborativeSessionOptions) {
  const {
    sessionId,
    isOwner,
    onResponseNew,
    onFollowUpNew,
    onNotesUpdated,
    onParticipantJoined,
    onParticipantLeft,
    onPhaseChanged,
    onDuplicate,
    onSessionRevoked,
    onTypingStart,
    onTypingStop,
  } = options;

  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [writeQueue, setWriteQueue] = useState<QueuedWrite[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const lastSeqRef = useRef<number>(0);
  const retryCountRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  const callbacksRef = useRef(options);
  callbacksRef.current = options;

  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const msg: CollabEvent = JSON.parse(event.data);
      if (msg.seq) lastSeqRef.current = msg.seq;

      const cb = callbacksRef.current;
      switch (msg.type) {
        case 'connection:established':
          retryCountRef.current = 0;
          break;
        case 'response:new':
          cb.onResponseNew?.(msg.data);
          break;
        case 'followup:new':
          cb.onFollowUpNew?.(msg.data);
          break;
        case 'juror:notes-updated':
          cb.onNotesUpdated?.(msg.data);
          break;
        case 'participant:joined':
          cb.onParticipantJoined?.(msg.data);
          break;
        case 'participant:left':
          cb.onParticipantLeft?.(msg.data);
          break;
        case 'phase:changed':
          cb.onPhaseChanged?.(msg.data);
          break;
        case 'response:deleted':
          cb.onResponseDeleted?.(msg.data);
          break;
        case 'response:duplicate':
        case 'response:conflict':
          cb.onDuplicate?.(msg.data);
          break;
        case 'session:revoked':
          cb.onSessionRevoked?.();
          break;
        case 'typing:start':
          cb.onTypingStart?.(msg.data);
          break;
        case 'typing:stop':
          cb.onTypingStop?.(msg.data);
          break;
      }
    } catch {}
  }, []);

  const connect = useCallback(() => {
    if (!sessionId || !mountedRef.current) return;

    const token = isOwner ? getAuthToken() : getCollabToken();
    if (!token) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const lastSeq = lastSeqRef.current;
    let url = `${protocol}//${window.location.host}/ws/collab?token=${encodeURIComponent(token)}&lastSeq=${lastSeq}`;
    if (isOwner) {
      url += `&sessionId=${encodeURIComponent(sessionId)}`;
    }

    setStatus(retryCountRef.current > 0 ? 'reconnecting' : 'connecting');

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      if (!mountedRef.current) { ws.close(); return; }
      setStatus('connected');
      retryCountRef.current = 0;
    };

    ws.onmessage = handleMessage;

    ws.onclose = (e) => {
      if (!mountedRef.current) return;
      wsRef.current = null;

      if (e.code === 4000 || e.code === 4001 || e.code === 4002) {
        setStatus('disconnected');
        if (e.code !== 4000) callbacksRef.current.onSessionRevoked?.();
        return;
      }

      setStatus('reconnecting');
      const backoff = Math.min(1000 * Math.pow(2, retryCountRef.current), 30000);
      retryCountRef.current++;
      retryTimerRef.current = setTimeout(() => {
        if (mountedRef.current) connect();
      }, backoff);
    };

    ws.onerror = () => {};
  }, [sessionId, isOwner, handleMessage]);

  useEffect(() => {
    mountedRef.current = true;
    if (sessionId) {
      connect();
    }
    return () => {
      mountedRef.current = false;
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
        wsRef.current = null;
      }
      setStatus('disconnected');
    };
  }, [sessionId, connect]);

  const sendEvent = useCallback((type: string, data?: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, data }));
    }
  }, []);

  const sendTypingStart = useCallback((jurorNumber: number) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'typing:start', jurorNumber }));
    }
  }, []);

  const sendTypingStop = useCallback((jurorNumber: number) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'typing:stop', jurorNumber }));
    }
  }, []);

  const addToWriteQueue = useCallback((write: QueuedWrite) => {
    setWriteQueue(q => [...q, write]);
  }, []);

  const flushWriteQueue = useCallback(async () => {
    if (writeQueue.length === 0) return;
    const queue = [...writeQueue];
    setWriteQueue([]);
    for (let i = 0; i < queue.length; i++) {
      const item = queue[i];
      try {
        if (item.type === 'response') {
          const { collabRecordResponse } = await import('../lib/api');
          await collabRecordResponse(item.payload);
        } else if (item.type === 'followup') {
          const { collabAddFollowUp } = await import('../lib/api');
          await collabAddFollowUp(item.payload.responseId, item.payload.followUp);
        } else if (item.type === 'notes') {
          const { collabUpdateJurorNotes } = await import('../lib/api');
          await collabUpdateJurorNotes(item.payload.jurorNumber, item.payload.notes);
        }
      } catch {
        setWriteQueue(q => [...queue.slice(i), ...q]);
        break;
      }
    }
  }, [writeQueue]);

  useEffect(() => {
    if (status === 'connected' && writeQueue.length > 0) {
      flushWriteQueue();
    }
  }, [status, writeQueue.length, flushWriteQueue]);

  return {
    status,
    sendTypingStart,
    sendTypingStop,
    addToWriteQueue,
    writeQueueLength: writeQueue.length,
  };
}
