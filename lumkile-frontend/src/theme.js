const KEY = 'lbj.theme';

export function initTheme() {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved) document.documentElement.dataset.theme = saved;
  } catch { /* ignore */ }
}

export function toggleTheme() {
  const root = document.documentElement;
  const prefersLight = window.matchMedia?.('(prefers-color-scheme: light)').matches;
  const current = root.dataset.theme || (prefersLight ? 'light' : 'dark');
  const next = current === 'dark' ? 'light' : 'dark';
  root.dataset.theme = next;
  try { localStorage.setItem(KEY, next); } catch { /* ignore */ }
}
