import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { storage } from "./storage";

const COLLAB_JWT_SECRET = process.env.JWT_SECRET
  ? process.env.JWT_SECRET + "-collab"
  : "voir-dire-collab-jwt-secret";

const COLLAB_TOKEN_EXPIRY = "12h";

export interface CollabJwtPayload {
  sessionId: string;
  participantId: string;
  displayName: string;
  caseId: string;
  type: "collaborator";
}

declare global {
  namespace Express {
    interface Request {
      collab?: CollabJwtPayload;
    }
  }
}

export function createCollabToken(payload: Omit<CollabJwtPayload, "type">): string {
  return jwt.sign({ ...payload, type: "collaborator" } as CollabJwtPayload, COLLAB_JWT_SECRET, {
    expiresIn: COLLAB_TOKEN_EXPIRY,
  });
}

export function verifyCollabToken(token: string): CollabJwtPayload | null {
  try {
    const payload = jwt.verify(token, COLLAB_JWT_SECRET) as CollabJwtPayload;
    if (payload.type !== "collaborator") return null;
    return payload;
  } catch {
    return null;
  }
}

export async function collabAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Collaborator authentication required" });
  }

  const token = authHeader.slice(7);
  const payload = verifyCollabToken(token);
  if (!payload) {
    return res.status(401).json({ message: "Invalid or expired session token" });
  }

  const session = await storage.getCollaborativeSessionById(payload.sessionId);
  if (!session || !session.isActive) {
    return res.status(403).json({ message: "Session has been revoked or is no longer active" });
  }

  const participants = await storage.getSessionParticipants(payload.sessionId);
  const participantExists = participants.some(p => p.id === payload.participantId);
  if (!participantExists) {
    return res.status(403).json({ message: "Participant no longer in session" });
  }

  req.collab = payload;
  next();
}

export function generateSessionCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
