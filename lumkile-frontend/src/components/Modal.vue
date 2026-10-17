<script setup>
import { onMounted, onBeforeUnmount } from 'vue';

defineProps({ title: String });
const emit = defineEmits(['close']);

function onKey(e) { if (e.key === 'Escape') emit('close'); }
onMounted(() => document.addEventListener('keydown', onKey));
onBeforeUnmount(() => document.removeEventListener('keydown', onKey));
</script>

<template>
  <Teleport to="body">
    <div class="modal-backdrop" @mousedown.self="emit('close')">
      <div class="modal" role="dialog" aria-modal="true" :aria-label="title">
        <h3 v-if="title">{{ title }}</h3>
        <slot />
      </div>
    </div>
  </Teleport>
</template>
