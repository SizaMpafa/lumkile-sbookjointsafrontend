<script setup>
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuth } from '../stores/auth';
import { homeFor } from '../utils';

const auth = useAuth();
const route = useRoute();
const router = useRouter();

const email = ref('');
const password = ref('');
const busy = ref(false);
const error = ref('');

async function submit() {
  error.value = '';
  if (!email.value.trim() || !password.value) {
    error.value = 'Enter your email and password.';
    return;
  }
  busy.value = true;
  try {
    await auth.login(email.value.trim(), password.value);
    if (auth.mustChange) return router.replace('/account');
    const next = route.query.next;
    const safe = typeof next === 'string' && next.startsWith('/') && !next.startsWith('//');
    router.replace(safe ? next : homeFor(auth.user));
  } catch (err) {
    error.value = err.message;
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <main class="login-screen">
    <form class="login-card" novalidate @submit.prevent="submit">
      <span class="mark"><span class="dot"></span>Lumkile's Book Joint SA</span>
      <h1>Log in</h1>
      <p class="sub">One login for everyone. Where you land depends on your account, not on anything you pick here.</p>

      <p v-if="route.query.expired" class="callout warn">Your session expired. Please log in again.</p>

      <div class="field">
        <label for="email">Email</label>
        <input id="email" v-model="email" type="email" autocomplete="username" inputmode="email" placeholder="you@example.com" />
      </div>
      <div class="field">
        <label for="password">Password</label>
        <input id="password" v-model="password" type="password" autocomplete="current-password" placeholder="••••••••" />
      </div>

      <p v-if="error" class="form-error" role="alert">{{ error }}</p>
      <button class="btn btn-primary block" type="submit" :disabled="busy">
        <span v-if="busy" class="spinner"></span>{{ busy ? 'Logging in…' : 'Log in' }}
      </button>

      <p class="fine">
        Accounts are created by the staff at the Book Joint once you've visited. Forgot your password? Ask them to send you a new one.
      </p>
    </form>
  </main>
</template>
