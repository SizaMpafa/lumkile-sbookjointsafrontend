<script setup>
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuth } from '../stores/auth';
import { toggleTheme } from '../theme';
import { homeFor } from '../utils';

const auth = useAuth();
const router = useRouter();

const links = computed(() => {
  if (auth.mustChange) return [];
  if (auth.isStaff) {
    return [
      { to: '/staff/requests', label: 'Requests' },
      { to: '/staff/catalog', label: 'Catalog' },
      { to: '/staff/visitors', label: 'Visitors' },
      { to: '/staff/attendance', label: 'Attendance' },
      { to: '/staff/accounts', label: 'Accounts' },
    ];
  }
  return [
    { to: '/shelf', label: 'Shelf' },
    { to: '/my-visits', label: 'My visits' },
    { to: '/my-loans', label: 'My loans' },
  ];
});

function logout() {
  auth.logout();
  router.replace('/login');
}
</script>

<template>
  <header class="app-bar wrap">
    <div class="bar-top">
      <RouterLink :to="homeFor(auth.user)" class="mark"><span class="dot"></span>Lumkile's Book Joint</RouterLink>
      <div class="who">
        <span><b>{{ auth.user?.full_name }}</b> <span class="role-tag">{{ auth.user?.role }}</span></span>
        <RouterLink v-if="!auth.mustChange" to="/account" class="link-btn">Account</RouterLink>
        <button type="button" class="link-btn" @click="toggleTheme">Light / dark</button>
        <button type="button" class="link-btn" @click="logout">Log out</button>
      </div>
    </div>
    <nav v-if="links.length" class="nav" aria-label="Main">
      <RouterLink v-for="l in links" :key="l.to" :to="l.to">{{ l.label }}</RouterLink>
    </nav>
  </header>
</template>
