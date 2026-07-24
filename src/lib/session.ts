export interface MemberSession {
  token: string;
  memberId: string;
  groupCode: string;
  groupName: string;
}

export interface UserSession {
  token: string;
  userId: string;
  email: string;
}

const SESSIONS_KEY = "rotation.sessions";
const LAST_GROUP_KEY = "rotation.lastGroupCode";
const SESSIONS_COOKIE = "rotation_sessions";
const LAST_GROUP_COOKIE = "rotation_last_group";
const USER_SESSION_KEY = "rotation.userSession";
const USER_SESSION_COOKIE = "rotation_user_session";
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function writeCookie(name: string, value: string, maxAgeSeconds: number) {
  if (typeof document === "undefined") return;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAgeSeconds}; SameSite=Lax${secure}`;
}

/**
 * iOS peut vider le localStorage d'une PWA installée sur l'écran d'accueil (comportement
 * WebKit documenté, indépendant de notre code — le processus web de l'app est distinct de
 * Safari et sa persistance de stockage est moins fiable). Un cookie miroir sert de filet :
 * plus stable dans ce cas précis, et régénère le localStorage au prochain chargement.
 */
function readSessions(): Record<string, MemberSession> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(SESSIONS_KEY);
    if (raw) return JSON.parse(raw) as Record<string, MemberSession>;
  } catch {
    // ignoré volontairement — on retente via le cookie ci-dessous
  }

  const cookieRaw = readCookie(SESSIONS_COOKIE);
  if (!cookieRaw) return {};
  try {
    const sessions = JSON.parse(cookieRaw) as Record<string, MemberSession>;
    window.localStorage.setItem(SESSIONS_KEY, cookieRaw);
    return sessions;
  } catch {
    return {};
  }
}

function writeSessions(sessions: Record<string, MemberSession>) {
  if (typeof window === "undefined") return;
  const raw = JSON.stringify(sessions);
  window.localStorage.setItem(SESSIONS_KEY, raw);
  writeCookie(SESSIONS_COOKIE, raw, ONE_YEAR_SECONDS);
}

export function getSession(groupCode: string): MemberSession | null {
  return readSessions()[groupCode.toUpperCase()] ?? null;
}

/** Tous les groupes où ce membre a une session active sur cet appareil — ex. pour choisir
 * dans quel groupe partager après un partage natif (Web Share Target) reçu hors contexte. */
export function getAllSessions(): MemberSession[] {
  return Object.values(readSessions());
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
  const fromStorage = window.localStorage.getItem(LAST_GROUP_KEY);
  if (fromStorage) return fromStorage;

  const fromCookie = readCookie(LAST_GROUP_COOKIE);
  if (fromCookie) window.localStorage.setItem(LAST_GROUP_KEY, fromCookie);
  return fromCookie;
}

export function setLastGroupCode(code: string) {
  if (typeof window === "undefined") return;
  const normalized = code.toUpperCase();
  window.localStorage.setItem(LAST_GROUP_KEY, normalized);
  writeCookie(LAST_GROUP_COOKIE, normalized, ONE_YEAR_SECONDS);
}

/**
 * Session de compte (email + mot de passe), distincte des sessions de membre par
 * groupe ci-dessus : un seul compte actif par appareil, indépendant du groupe
 * consulté. Même filet cookie-miroir pour la fiabilité sur iOS installé en PWA.
 */
export function getUserSession(): UserSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(USER_SESSION_KEY);
    if (raw) return JSON.parse(raw) as UserSession;
  } catch {
    // ignoré volontairement — on retente via le cookie ci-dessous
  }

  const cookieRaw = readCookie(USER_SESSION_COOKIE);
  if (!cookieRaw) return null;
  try {
    const session = JSON.parse(cookieRaw) as UserSession;
    window.localStorage.setItem(USER_SESSION_KEY, cookieRaw);
    return session;
  } catch {
    return null;
  }
}

export function saveUserSession(session: UserSession) {
  if (typeof window === "undefined") return;
  const raw = JSON.stringify(session);
  window.localStorage.setItem(USER_SESSION_KEY, raw);
  writeCookie(USER_SESSION_COOKIE, raw, ONE_YEAR_SECONDS);
}

export function clearUserSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(USER_SESSION_KEY);
  writeCookie(USER_SESSION_COOKIE, "", 0);
}
