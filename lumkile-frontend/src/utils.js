const TZ = 'Africa/Johannesburg';

export const SPINES = ['#E4A03B', '#A8542E', '#7E8F6A', '#4E6E8E'];
export const spineFor = (id) => SPINES[Number(id) % SPINES.length];

export const LENGTH_LABEL = { short: 'Short read', medium: 'Medium read', long: 'Long read' };
export const LOAN_WEEKS = { short: 1, medium: 2, long: 3 };

export const homeFor = (user) => (user?.role === 'staff' ? '/staff/requests' : '/shelf');

// "2026-10-06" in South African time
export function todayISO() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

// 'YYYY-MM-DD' -> local Date at midnight (a plain new Date('2026-10-06') would shift by timezone)
export function parseDate(value) {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function fmtDate(value, withYear = false) {
  const date = parseDate(value);
  if (!date) return '';
  return date.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', ...(withYear ? { year: 'numeric' } : {}) });
}

export function fmtDay(value) {
  const date = parseDate(value);
  return date ? date.toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short' }) : '';
}

// whole days from today until `due` (negative = overdue)
export function daysUntil(due) {
  const d = parseDate(due);
  const t = parseDate(todayISO());
  if (!d || !t) return null;
  return Math.round((d - t) / 86400000);
}

export function dueInfo(due) {
  const n = daysUntil(due);
  if (n === null) return { text: '', overdue: false };
  if (n < 0) return { text: `Overdue by ${-n} day${n === -1 ? '' : 's'} (was due ${fmtDay(due)})`, overdue: true };
  if (n === 0) return { text: 'Due today', overdue: false };
  if (n === 1) return { text: 'Due tomorrow', overdue: false };
  return { text: `Due ${fmtDay(due)}`, overdue: false };
}

export function debounce(fn, ms = 300) {
  let t;
  const wrapped = (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
  wrapped.cancel = () => clearTimeout(t);
  return wrapped;
}

export const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
