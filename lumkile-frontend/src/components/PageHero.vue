<script setup>
defineProps({ title: String, dek: String });
</script>

<template>
  <section class="hero wrap">
    <h1>{{ title }}</h1>
    <p v-if="dek" class="dek">{{ dek }}</p>
    <div class="stats"><slot name="stats" /></div>
  </section>
</template>
