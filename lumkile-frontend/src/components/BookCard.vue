<script setup>
import { computed } from 'vue';
import { spineFor, LENGTH_LABEL } from '../utils';

const props = defineProps({
  book: { type: Object, required: true },
  pillOverride: { type: Object, default: null }, // { kind, label } e.g. "You requested this"
});

const pill = computed(() => {
  if (props.pillOverride) return props.pillOverride;
  const b = props.book;
  if (!b.is_lendable) return { kind: 'reference', label: 'Library copy' };
  if (b.status === 'requested') return { kind: 'pending', label: 'Requested' };
  if (b.status === 'on_loan') return { kind: 'loan', label: 'On loan' };
  return { kind: 'available', label: 'Available' };
});
</script>

<template>
  <article class="book">
    <div class="spine" :style="{ background: spineFor(book.id) }"></div>
    <div class="book-info">
      <h3 class="book-title">{{ book.title }}</h3>
      <p class="book-author">{{ book.author }}</p>
      <div class="pills">
        <span class="pill" :class="pill.kind">{{ pill.label }}</span>
        <span v-if="book.length" class="meta">{{ LENGTH_LABEL[book.length] }}</span>
      </div>
      <slot name="note" />
      <div class="book-actions"><slot name="actions" /></div>
    </div>
  </article>
</template>
