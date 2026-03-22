const COLLAB_TOKEN_KEY = 'voir_dire_collab_token';
const COLLAB_SESSION_KEY = 'voir_dire_collab_session';

export interface CollabSession {
  token: string;
  sessionId: string;
  participantId: string;
  displayName: string;
  caseId: string;
  caseName: string;
  role: "recorder" | "questioner";
}

export function getCollabToken(): string | null {
  return sessionStorage.getItem(COLLAB_TOKEN_KEY);
}

export function getCollabSession(): CollabSession | null {
  const raw = sessionStorage.getItem(COLLAB_SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setCollabSession(session: CollabSession): void {
  sessionStorage.setItem(COLLAB_TOKEN_KEY, session.token);
  sessionStorage.setItem(COLLAB_SESSION_KEY, JSON.stringify(session));
}

export function clearCollabSession(): void {
  sessionStorage.removeItem(COLLAB_TOKEN_KEY);
  sessionStorage.removeItem(COLLAB_SESSION_KEY);
}
