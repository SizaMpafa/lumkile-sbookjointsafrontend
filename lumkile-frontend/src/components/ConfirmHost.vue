<script setup>
import { confirmState, answerConfirm } from '../confirm';
import Modal from './Modal.vue';
</script>

<template>
  <Modal v-if="confirmState.open" :title="confirmState.title" @close="answerConfirm(false)">
    <p v-if="confirmState.message" class="muted">{{ confirmState.message }}</p>
    <div class="modal-actions">
      <button type="button" class="btn btn-ghost" @click="answerConfirm(false)">Cancel</button>
      <button type="button" class="btn" :class="confirmState.danger ? 'btn-danger' : 'btn-primary'" @click="answerConfirm(true)">
        {{ confirmState.confirmLabel }}
      </button>
    </div>
  </Modal>
</template>
