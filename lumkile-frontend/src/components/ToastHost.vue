<script setup>
import { toasts, dismissToast } from '../toast';
</script>

<template>
  <div class="toasts" aria-live="polite">
    <div v-for="t in toasts" :key="t.id" class="toast" :class="t.kind" role="status" @click="dismissToast(t.id)">
      {{ t.message }}
    </div>
  </div>
</template>
