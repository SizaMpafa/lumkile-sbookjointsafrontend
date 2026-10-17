<script setup>
defineProps({ modelValue: String, options: { type: Array, required: true } });
const emit = defineEmits(['update:modelValue']);
</script>

<template>
  <div class="filters" role="tablist">
    <button
      v-for="o in options"
      :key="o.value"
      type="button"
      role="tab"
      :class="{ active: o.value === modelValue }"
      :aria-selected="o.value === modelValue"
      @click="emit('update:modelValue', o.value)"
    >
      {{ o.label }}<span v-if="o.count !== undefined && o.count !== null" class="count">{{ o.count }}</span>
    </button>
  </div>
</template>
