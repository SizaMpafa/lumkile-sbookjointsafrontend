import { reactive } from 'vue';

export const toasts = reactive([]);
let nextId = 0;

export function dismissToast(id) {
  const i = toasts.findIndex((t) => t.id === id);
  if (i >= 0) toasts.splice(i, 1);
}
function push(kind, message, ms) {
  const t = { id: ++nextId, kind, message };
  toasts.push(t);
  setTimeout(() => dismissToast(t.id), ms);
}

export const toast = {
  success: (message) => push('success', message, 4200),
  error: (message) => push('error', message, 7500),
  info: (message) => push('info', message, 4500),
};
