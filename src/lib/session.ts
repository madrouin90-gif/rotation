export interface MemberSession {
  token: string;
  memberId: string;
  groupCode: string;
  groupName: string;
}

const SESSIONS_KEY = "rotation.sessions";
const LAST_GROUP_KEY = "rotation.lastGroupCode";

function readSessions(): Record<string, MemberSession> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(SESSIONS_KEY);
    return raw ? (JSON.parse(raw) as Record<string, MemberSession>) : {};
  } catch {
    return {};
  }
}

function writeSessions(sessions: Record<string, MemberSession>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
}

export function getSession(groupCode: string): MemberSession | null {
  return readSessions()[groupCode.toUpperCase()] ?? null;
}

export function saveSession(session: MemberSession) {
  const sessions = readSessions();
  sessions[session.groupCode.toUpperCase()] = session;
  writeSessions(sessions);
  setLastGroupCode(session.groupCode);
}

export function clearSession(groupCode: string) {
  const sessions = readSessions();
  delete sessions[groupCode.toUpperCase()];
  writeSessions(sessions);
}

export function getLastGroupCode(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(LAST_GROUP_KEY);
}

export function setLastGroupCode(code: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LAST_GROUP_KEY, code.toUpperCase());
}
