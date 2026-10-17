<script setup>
import { ref, reactive, computed, watch, onMounted } from 'vue';
import { api, patch, qs } from '../../api';
import { toast } from '../../toast';
import { askConfirm } from '../../confirm';
import { fmtDate, dueInfo, LOAN_WEEKS, LENGTH_LABEL, plural } from '../../utils';
import PageHero from '../../components/PageHero.vue';
import SegTabs from '../../components/SegTabs.vue';

const tab = ref('pending');
const items = ref([]);
const loading = ref(true);
const stats = ref(null);
const counts = reactive({ pending: null, active: null, overdue: null });
const weeks = reactive({}); // request id -> chosen weeks (defaults from the book's length)
const busyId = ref(null);

const TABS = computed(() => [
  { value: 'pending', label: 'Pending', count: counts.pending },
  { value: 'active', label: 'On loan', count: counts.active },
  { value: 'overdue', label: 'Overdue', count: counts.overdue },
  { value: 'returned', label: 'Returned' },
  { value: 'declined', label: 'Declined' },
]);

const EMPTY = {
  pending: ['No requests waiting', 'New borrow requests from customers show up here.'],
  active: ['Nothing on loan', 'Approved books that are out will be listed here.'],
  overdue: ['Nothing overdue', "Every borrowed book is within its return date."],
  returned: ['No returns yet', 'Returned books will be listed here.'],
  declined: ['No declined requests', ''],
};

let seq = 0;
async function load() {
  const mine = ++seq;
  loading.value = true;
  try {
    const d = await api('/api/loan-requests' + qs({ status: tab.value, limit: 100 }));
    if (mine !== seq) return;
    items.value = d.requests;
    for (const r of d.requests) weeks[r.id] ??= LOAN_WEEKS[r.book?.length] ?? 2;
  } catch (err) {
    if (mine === seq) toast.error(err.message);
  } finally {
    if (mine === seq) loading.value = false;
  }
}

async function loadMeta() {
  const [s, p, a, o] = await Promise.allSettled([
    api('/api/books/stats'),
    ...['pending', 'active', 'overdue'].map((status) => api('/api/loan-requests' + qs({ status, limit: 1 }))),
  ]);
  if (s.status === 'fulfilled') stats.value = s.value;
  if (p.status === 'fulfilled') counts.pending = p.value.count;
  if (a.status === 'fulfilled') counts.active = a.value.count;
  if (o.status === 'fulfilled') counts.overdue = o.value.count;
}

async function act(r, action, body, successMessage) {
  busyId.value = r.id;
  try {
    await patch(`/api/loan-requests/${r.id}/${action}`, body);
    toast.success(successMessage);
  } catch (err) {
    toast.error(err.message);
  } finally {
    busyId.value = null;
    await Promise.all([load(), loadMeta()]);
  }
}

const approve = (r) => act(r, 'approve', { weeks: Number(weeks[r.id]) }, `Approved “${r.book.title}” for ${r.requester.full_name}. Due back in ${plural(Number(weeks[r.id]), 'week')}.`);

async function decline(r) {
  const ok = await askConfirm({
    title: 'Decline this request?',
    message: `“${r.book.title}” goes straight back on the shelf as available.`,
    confirmLabel: 'Decline',
    danger: true,
  });
  if (ok) await act(r, 'decline', undefined, `Declined the request for “${r.book.title}”.`);
}

async function markReturned(r) {
  const ok = await askConfirm({
    title: 'Mark as returned?',
    message: `${r.requester.full_name} has brought “${r.book.title}” back.`,
    confirmLabel: 'Mark returned',
  });
  if (ok) await act(r, 'return', undefined, `“${r.book.title}” is back on the shelf.`);
}

watch(tab, load);
onMounted(() => { load(); loadMeta(); });
</script>

<template>
  <PageHero title="Requests waiting on you." dek="Approve or decline borrow requests, and mark books as returned when they come back.">
    <template #stats>
      <div class="stat"><span class="n">{{ counts.pending ?? '—' }}</span><span class="l">requests waiting</span></div>
      <div class="stat"><span class="n">{{ stats?.on_loan ?? '—' }}</span><span class="l">out on loan</span></div>
      <div class="stat"><span class="n">{{ counts.overdue ?? '—' }}</span><span class="l">overdue</span></div>
      <div class="stat"><span class="n">{{ stats?.available ?? '—' }}</span><span class="l">available to lend</span></div>
    </template>
  </PageHero>

  <main class="wrap page">
    <div class="toolbar"><SegTabs v-model="tab" :options="TABS" /></div>

    <p v-if="loading && !items.length" class="notice"><span class="spinner"></span> Loading…</p>
    <div v-else-if="!items.length" class="empty"><h3>{{ EMPTY[tab][0] }}</h3><p>{{ EMPTY[tab][1] }}</p></div>

    <div v-else class="rows">
      <div v-for="r in items" :key="r.id" class="row">
        <div class="row-main">
          <div class="row-title">{{ r.book.title }}</div>
          <div class="row-sub">
            <b>{{ r.requester.full_name }}</b> ·
            <a :href="`tel:${r.requester.phone}`">{{ r.requester.phone }}</a> · asked {{ fmtDate(r.requested_at) }}
          </div>
          <div v-if="r.decision === 'approved' && !r.returned_at" class="row-sub" :class="{ warn: dueInfo(r.due_date).overdue }">
            {{ dueInfo(r.due_date).text }}
          </div>
          <div v-else-if="r.returned_at" class="row-sub">Returned {{ fmtDate(r.returned_at) }} · was due {{ fmtDate(r.due_date) }}</div>
          <div v-else-if="r.decision === 'declined'" class="row-sub">Declined {{ fmtDate(r.decided_at) }}<template v-if="r.decider"> by {{ r.decider.full_name }}</template></div>
        </div>

        <div v-if="r.decision === 'pending'" class="row-actions">
          <label class="muted" style="font-size: 12.5px" :for="`w-${r.id}`">Return in</label>
          <select :id="`w-${r.id}`" v-model="weeks[r.id]" class="select select-sm" :title="`Suggested from the book's length: ${LENGTH_LABEL[r.book.length]}`">
            <option v-for="n in 6" :key="n" :value="n">{{ plural(n, 'week') }}</option>
          </select>
          <button type="button" class="btn btn-ghost btn-sm" :disabled="busyId === r.id" @click="decline(r)">Decline</button>
          <button type="button" class="btn btn-primary btn-sm" :disabled="busyId === r.id" @click="approve(r)">
            <span v-if="busyId === r.id" class="spinner"></span>Approve
          </button>
        </div>
        <div v-else-if="r.decision === 'approved' && !r.returned_at" class="row-actions">
          <button type="button" class="btn btn-primary btn-sm" :disabled="busyId === r.id" @click="markReturned(r)">Mark returned</button>
        </div>
      </div>
    </div>
  </main>
</template>
