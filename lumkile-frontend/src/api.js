// Everything that talks to the Node backend lives here: base URL, auth header, automatic token
// refresh, friendly errors, and the "server is waking up" detector.
import { reactive } from 'vue';

const BASE = (import.meta.env.VITE_API_URL).replace(/\/+$/, '');
const STORAGE_KEY = 'lbj.session';
const TIMEOUT_MS = 90_000; // Render's free tier can take ~1 minute to wake up

export class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.name = 'ApiError';
    this.status = status; // 0 = could not reach the server at all
    this.details = details;
  }
}

/* ------------------------------------------------------------------ session */
// { access_token, refresh_token, expires_at, user, must_change_password }
let session = readSession();

function readSession() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || null; } catch { return null; }
}
export const getSession = () => session;
export function setSession(next) {
  session = next;
  try {
    if (next) localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    else localStorage.removeItem(STORAGE_KEY);
  } catch { /* storage unavailable (private mode): the session just lasts until the tab closes */ }
}
export const clearSession = () => setSession(null);

let expiredHandler = null;
export const onSessionExpired = (fn) => { expiredHandler = fn; };

/* ------------------------------------------------- "server is waking up" flag */
export const net = reactive({ pending: 0, slow: false });
let slowTimer = null;
function startedRequest() {
  net.pending += 1;
  if (net.pending === 1) slowTimer = setTimeout(() => { net.slow = true; }, 4000);
}
function finishedRequest() {
  net.pending = Math.max(0, net.pending - 1);
  if (net.pending === 0) { clearTimeout(slowTimer); net.slow = false; }
}

/* ------------------------------------------------------------------ fetching */
async function rawFetch(path, { method = 'GET', body, auth = true, token } = {}) {
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const bearer = token ?? (auth ? session?.access_token : null);
  if (bearer) headers.Authorization = `Bearer ${bearer}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let res;
  try {
    res = await fetch(BASE + path, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined, signal: controller.signal });
  } catch (err) {
    console.error('[api] could not reach', BASE + path, err);
    throw new ApiError(0, err?.name === 'AbortError'
      ? 'The server took too long to respond. Please try again.'
      : "Can't reach the server. Check your internet connection and try again.");
  } finally {
    clearTimeout(timer);
  }

  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { /* not JSON */ }
  if (!res.ok) throw new ApiError(res.status, data?.error || `Something went wrong (${res.status}).`, data?.details);
  return data;
}

// One refresh at a time, even if several requests hit an expired token together.
let refreshing = null;
function refreshSession() {
  if (!session?.refresh_token) return Promise.resolve(false);
  if (!refreshing) {
    refreshing = (async () => {
      try {
        const d = await rawFetch('/api/auth/refresh', { method: 'POST', body: { refresh_token: session.refresh_token }, auth: false });
        setSession({ ...session, access_token: d.access_token, refresh_token: d.refresh_token, expires_at: d.expires_at });
        return true;
      } catch {
        return false;
      } finally {
        refreshing = null;
      }
    })();
  }
  return refreshing;
}

/**
 * api('/api/books')  /  api('/api/books', { method: 'POST', body: {...} })
 * options: auth:false (no token), noRefresh:true (don't retry a 401 with a fresh token), token (explicit)
 */
export async function api(path, options = {}) {
  startedRequest();
  try {
    const usesSession = options.auth !== false && !options.token;
    // refresh a token that's about to expire before using it
    if (usesSession && session?.expires_at && session.expires_at - Date.now() / 1000 < 30) await refreshSession();

    try {
      return await rawFetch(path, options);
    } catch (err) {
      if (err.status === 401 && usesSession && !options.noRefresh && session?.refresh_token) {
        if (await refreshSession()) return await rawFetch(path, options);
        clearSession();
        expiredHandler?.();
      }
      throw err;
    }
  } finally {
    finishedRequest();
  }
}

export const post = (path, body, options) => api(path, { method: 'POST', body, ...options });
export const patch = (path, body, options) => api(path, { method: 'PATCH', body, ...options });
export const del = (path, options) => api(path, { method: 'DELETE', ...options });

export function qs(params = {}) {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') sp.set(key, value);
  }
  const s = sp.toString();
  return s ? `?${s}` : '';
}
