import { Server as HttpServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { verifyCollabToken, type CollabJwtPayload } from "./collabAuth";
import { verifyToken } from "./auth";
import { storage } from "./storage";
import { log } from "./index";

interface AuthenticatedSocket extends WebSocket {
  collabPayload?: CollabJwtPayload;
  ownerUserId?: string;
  sessionId?: string;
  participantId?: string;
  isAlive: boolean;
  lastEventSeq: number;
}

interface CollabEvent {
  type: string;
  seq: number;
  timestamp: number;
  data: any;
}

const sessionRooms = new Map<string, Set<AuthenticatedSocket>>();
const eventBuffers = new Map<string, CollabEvent[]>();
const MAX_EVENT_BUFFER = 500;
let globalSeq = 0;

function nextSeq(): number {
  return ++globalSeq;
}

export function broadcastToSession(sessionId: string, event: Omit<CollabEvent, "seq" | "timestamp">, excludeWs?: WebSocket) {
  const room = sessionRooms.get(sessionId);
  if (!room) return;

  const fullEvent: CollabEvent = {
    ...event,
    seq: nextSeq(),
    timestamp: Date.now(),
  };

  let buffer = eventBuffers.get(sessionId);
  if (!buffer) {
    buffer = [];
    eventBuffers.set(sessionId, buffer);
  }
  buffer.push(fullEvent);
  if (buffer.length > MAX_EVENT_BUFFER) {
    buffer.splice(0, buffer.length - MAX_EVENT_BUFFER);
  }

  const message = JSON.stringify(fullEvent);
  Array.from(room).forEach((client) => {
    if (client !== excludeWs && client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

export function disconnectAllInSession(sessionId: string) {
  const room = sessionRooms.get(sessionId);
  if (!room) return;

  Array.from(room).forEach((client) => {
    client.send(JSON.stringify({
      type: "session:revoked",
      seq: nextSeq(),
      timestamp: Date.now(),
      data: { message: "Session has been revoked by the case owner" },
    }));
    client.close(4001, "Session revoked");
  });

  sessionRooms.delete(sessionId);
  eventBuffers.delete(sessionId);
}

export function getConnectedParticipants(sessionId: string): string[] {
  const room = sessionRooms.get(sessionId);
  if (!room) return [];
  const names: string[] = [];
  Array.from(room).forEach((client) => {
    if (client.collabPayload?.displayName) {
      names.push(client.collabPayload.displayName);
    }
  });
  return names;
}

export function setupCollabWebSocket(httpServer: HttpServer) {
  const wss = new WebSocketServer({
    server: httpServer,
    path: "/ws/collab",
  });

  const heartbeatInterval = setInterval(() => {
    wss.clients.forEach((rawWs) => {
      const ws = rawWs as AuthenticatedSocket;
      if (!ws.isAlive) {
        handleDisconnect(ws);
        ws.terminate();
        return;
      }
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on("close", () => {
    clearInterval(heartbeatInterval);
  });

  wss.on("connection", async (rawWs, req) => {
    const ws = rawWs as AuthenticatedSocket;
    ws.isAlive = true;
    ws.lastEventSeq = 0;

    const url = new URL(req.url || "", `http://${req.headers.host}`);
    const token = url.searchParams.get("token");
    const lastSeq = parseInt(url.searchParams.get("lastSeq") || "0", 10);

    if (!token) {
      ws.close(4000, "Authentication required");
      return;
    }

    const collabPayload = verifyCollabToken(token);
    if (collabPayload) {
      const session = await storage.getCollaborativeSessionById(collabPayload.sessionId);
      if (!session || !session.isActive) {
        ws.close(4001, "Session not active");
        return;
      }

      ws.collabPayload = collabPayload;
      ws.sessionId = collabPayload.sessionId;
      ws.participantId = collabPayload.participantId;

      addToRoom(ws, collabPayload.sessionId);

      broadcastToSession(collabPayload.sessionId, {
        type: "participant:joined",
        data: { displayName: collabPayload.displayName, participantId: collabPayload.participantId },
      }, ws);

      if (lastSeq > 0) {
        replayMissedEvents(ws, collabPayload.sessionId, lastSeq);
      }

      ws.send(JSON.stringify({
        type: "connection:established",
        seq: nextSeq(),
        timestamp: Date.now(),
        data: { sessionId: collabPayload.sessionId, displayName: collabPayload.displayName },
      }));

    } else {
      const userPayload = verifyToken(token);
      if (!userPayload) {
        ws.close(4000, "Invalid token");
        return;
      }

      const sessionId = url.searchParams.get("sessionId");
      if (!sessionId) {
        ws.close(4000, "Session ID required for owner connections");
        return;
      }

      const session = await storage.getCollaborativeSessionById(sessionId);
      if (!session || !session.isActive || session.createdBy !== userPayload.userId) {
        ws.close(4001, "Not authorized for this session");
        return;
      }

      ws.ownerUserId = userPayload.userId;
      ws.sessionId = sessionId;
      addToRoom(ws, sessionId);

      ws.send(JSON.stringify({
        type: "connection:established",
        seq: nextSeq(),
        timestamp: Date.now(),
        data: { sessionId, role: "owner" },
      }));
    }

    ws.on("pong", () => {
      ws.isAlive = true;
      if (ws.participantId) {
        storage.updateParticipantActivity(ws.participantId).catch(() => {});
      }
    });

    ws.on("message", (rawMessage) => {
      try {
        const msg = JSON.parse(rawMessage.toString());
        if (msg.type === "typing:start" || msg.type === "typing:stop") {
          if (ws.sessionId) {
            broadcastToSession(ws.sessionId, {
              type: msg.type,
              data: {
                displayName: ws.collabPayload?.displayName || "Case Owner",
                jurorNumber: msg.jurorNumber,
              },
            }, ws);
          }
        }
      } catch {
      }
    });

    ws.on("close", () => {
      handleDisconnect(ws);
    });

    ws.on("error", () => {
      handleDisconnect(ws);
    });
  });

  log("Collaborative WebSocket server initialized on /ws/collab", "collab-ws");
}

function addToRoom(ws: AuthenticatedSocket, sessionId: string) {
  let room = sessionRooms.get(sessionId);
  if (!room) {
    room = new Set();
    sessionRooms.set(sessionId, room);
  }
  room.add(ws);
}

function handleDisconnect(ws: AuthenticatedSocket) {
  if (ws.sessionId) {
    const room = sessionRooms.get(ws.sessionId);
    if (room) {
      room.delete(ws);
      if (room.size === 0) {
        sessionRooms.delete(ws.sessionId);
      }
    }

    if (ws.collabPayload) {
      broadcastToSession(ws.sessionId, {
        type: "participant:left",
        data: { displayName: ws.collabPayload.displayName, participantId: ws.collabPayload.participantId },
      });

      if (ws.participantId) {
        storage.removeSessionParticipant(ws.participantId).catch(() => {});
      }
    }
  }
}

function replayMissedEvents(ws: AuthenticatedSocket, sessionId: string, lastSeq: number) {
  const buffer = eventBuffers.get(sessionId);
  if (!buffer) return;

  const missed = buffer.filter((e) => e.seq > lastSeq);
  for (const event of missed) {
    ws.send(JSON.stringify(event));
  }
}
