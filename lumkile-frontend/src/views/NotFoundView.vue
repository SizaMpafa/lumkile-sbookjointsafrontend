<script setup>
import { useAuth } from '../stores/auth';
import { homeFor } from '../utils';
const auth = useAuth();
</script>

<template>
  <main class="login-screen">
    <div class="login-card">
      <span class="mark"><span class="dot"></span>Lumkile's Book Joint SA</span>
      <h1>Page not found</h1>
      <p class="sub">That page doesn't exist.</p>
      <RouterLink class="btn btn-primary" :to="auth.isAuthed ? homeFor(auth.user) : '/login'">Take me back</RouterLink>
    </div>
  </main>
</template>
