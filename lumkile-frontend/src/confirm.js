import { reactive } from 'vue';

export const confirmState = reactive({ open: false, title: '', message: '', confirmLabel: 'Confirm', danger: false, resolve: null });

// const ok = await askConfirm({ title, message, confirmLabel, danger })
export function askConfirm({ title, message = '', confirmLabel = 'Confirm', danger = false }) {
  return new Promise((resolve) => {
    Object.assign(confirmState, { open: true, title, message, confirmLabel, danger, resolve });
  });
}
export function answerConfirm(value) {
  const { resolve } = confirmState;
  confirmState.open = false;
  confirmState.resolve = null;
  resolve?.(value);
}
