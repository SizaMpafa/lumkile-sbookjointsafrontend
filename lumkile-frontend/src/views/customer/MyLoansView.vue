<script setup>
import { ref, computed, onMounted } from 'vue';
import { api, qs } from '../../api';
import { toast } from '../../toast';
import { fmtDate, dueInfo } from '../../utils';
import PageHero from '../../components/PageHero.vue';

const requests = ref([]);
const loading = ref(true);

async function load() {
  try {
    const d = await api('/api/loan-requests/mine' + qs({ status: 'all', limit: 200 }));
    requests.value = d.requests;
  } catch (err) {
    toast.error(err.message);
  } finally {
    loading.value = false;
  }
}

const waiting = computed(() => requests.value.filter((r) => r.decision === 'pending'));
const onLoan = computed(() => requests.value.filter((r) => r.decision === 'approved' && !r.returned_at));
const past = computed(() => requests.value.filter((r) => r.decision === 'declined' || r.returned_at));

function pastLabel(r) {
  return r.decision === 'declined' ? `Declined ${fmtDate(r.decided_at)}` : `Returned ${fmtDate(r.returned_at)}`;
}

onMounted(load);
</script>

<template>
  <PageHero title="Your loans." dek="Books you've asked for, what you currently have, and when it's due back." />

  <main class="wrap page">
    <p v-if="loading" class="notice"><span class="spinner"></span> Loading…</p>
    <div v-else-if="!requests.length" class="empty">
      <h3>No requests yet</h3>
      <p>Find a book on the <RouterLink to="/shelf">shelf</RouterLink> and tap “Request to borrow”.</p>
    </div>

    <template v-else>
      <template v-if="onLoan.length">
        <h2 class="group-title">On loan to you</h2>
        <div class="rows">
          <div v-for="r in onLoan" :key="r.id" class="row">
            <div class="row-main">
              <div class="row-title">{{ r.book.title }}</div>
              <div class="row-sub">{{ r.book.author }}</div>
            </div>
            <span class="pill" :class="dueInfo(r.due_date).overdue ? 'loan' : 'available'">{{ dueInfo(r.due_date).text }}</span>
          </div>
        </div>
      </template>

      <template v-if="waiting.length">
        <h2 class="group-title">Waiting for approval</h2>
        <div class="rows">
          <div v-for="r in waiting" :key="r.id" class="row">
            <div class="row-main">
              <div class="row-title">{{ r.book.title }}</div>
              <div class="row-sub">{{ r.book.author }} · asked {{ fmtDate(r.requested_at) }}</div>
            </div>
            <span class="pill pending">Pending</span>
          </div>
        </div>
      </template>

      <template v-if="past.length">
        <h2 class="group-title">Past</h2>
        <div class="rows">
          <div v-for="r in past" :key="r.id" class="row">
            <div class="row-main">
              <div class="row-title">{{ r.book.title }}</div>
              <div class="row-sub">{{ r.book.author }}</div>
            </div>
            <span class="pill reference">{{ pastLabel(r) }}</span>
          </div>
        </div>
      </template>
    </template>
  </main>
</template>
