<script setup>
import { useAuth } from './stores/auth';
import { net } from './api';
import AppHeader from './components/AppHeader.vue';
import ToastHost from './components/ToastHost.vue';
import ConfirmHost from './components/ConfirmHost.vue';

const auth = useAuth();
auth.whenReady(); // verify any saved login in the background while the splash shows
</script>

<template>
  <div v-if="!auth.ready" class="splash" role="status">
    <span class="mark"><span class="dot"></span>Lumkile's Book Joint</span>
    <span class="spinner"></span>
    <p v-if="net.slow" class="muted">Waking the server up. The free hosting sleeps when idle, so this can take up to a minute…</p>
  </div>

  <template v-else>
    <div v-if="net.slow" class="banner" role="status">
      Waking the server up. The free hosting sleeps when idle, so the first request can take up to a minute…
    </div>
    <AppHeader v-if="auth.isAuthed" />
    <RouterView />
  </template>

  <ToastHost />
  <ConfirmHost />
</template>
