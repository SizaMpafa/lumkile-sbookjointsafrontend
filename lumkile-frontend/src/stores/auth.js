import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { api, getSession, setSession, clearSession } from '../api';

export const useAuth = defineStore('auth', () => {
  const saved = getSession();
  const user = ref(saved?.user ?? null);
  const mustChange = ref(Boolean(saved?.must_change_password));
  const ready = ref(false);

  const isAuthed = computed(() => Boolean(user.value));
  const isStaff = computed(() => user.value?.role === 'staff');
  const isCustomer = computed(() => user.value?.role === 'customer');

  // Checks the saved session against the server once, when the app opens.
  let readyPromise = null;
  function whenReady() {
    if (!readyPromise) {
      readyPromise = (async () => {
        if (getSession()?.access_token) {
          try {
            const me = await api('/api/auth/me');
            applyUser(me.user, me.must_change_password);
          } catch (err) {
            // 401/403 = the session is dead (api() already cleared it on 401). Anything else
            // (server asleep, offline): keep the saved login and let real requests report it.
            if (err.status === 401 || err.status === 403) reset();
          }
        }
        ready.value = true;
      })();
    }
    return readyPromise;
  }

  function applyUser(nextUser, nextMustChange) {
    user.value = nextUser;
    mustChange.value = Boolean(nextMustChange);
    const s = getSession();
    if (s) setSession({ ...s, user: nextUser, must_change_password: Boolean(nextMustChange) });
  }

  function reset() {
    clearSession();
    user.value = null;
    mustChange.value = false;
  }

  async function login(email, password) {
    const d = await api('/api/auth/login', { method: 'POST', body: { email, password }, auth: false });
    setSession({
      access_token: d.access_token,
      refresh_token: d.refresh_token,
      expires_at: d.expires_at,
      user: d.user,
      must_change_password: d.must_change_password,
    });
    user.value = d.user;
    mustChange.value = Boolean(d.must_change_password);
    return d;
  }

  function logout() {
    const token = getSession()?.access_token;
    reset();
    // Tell the server in the background; the person is logged out here regardless.
    if (token) api('/api/auth/logout', { method: 'POST', token, noRefresh: true }).catch(() => {});
  }

  async function changePassword(current_password, new_password) {
    await api('/api/auth/change-password', { method: 'POST', body: { current_password, new_password }, noRefresh: true });
    applyUser(user.value, false);
  }

  return { user, mustChange, ready, isAuthed, isStaff, isCustomer, whenReady, login, logout, changePassword, applyUser, reset };
});
