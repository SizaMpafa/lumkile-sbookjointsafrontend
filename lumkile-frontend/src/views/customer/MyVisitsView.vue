<script setup>
import { ref, onMounted } from 'vue';
import { api, post } from '../../api';
import { useAuth } from '../../stores/auth';
import { toast } from '../../toast';
import { fmtDay, plural } from '../../utils';
import PageHero from '../../components/PageHero.vue';

const auth = useAuth();
const visitCount = ref(null);
const visits = ref([]);
const loading = ref(true);
const recording = ref(false);

async function load() {
  try {
    const d = await api('/api/attendances/me');
    visitCount.value = d.visit_count;
    visits.value = d.attendances;
  } catch (err) {
    toast.error(err.message);
  } finally {
    loading.value = false;
  }
}

async function recordVisit() {
  recording.value = true;
  try {
    const d = await post('/api/attendances/me');
    toast.success(`Visit recorded. That's ${plural(d.visit_count, 'visit')} in total.`);
  } catch (err) {
    // 409 = already recorded today, which is fine news rather than an error
    err.status === 409 ? toast.info("You're already checked in for today.") : toast.error(err.message);
  } finally {
    recording.value = false;
    await load();
  }
}

onMounted(load);
</script>

<template>
  <PageHero title="Your visits." dek="Check yourself in whenever you come to a session. One check-in per day." />

  <main class="wrap page">
    <div class="page-head" style="align-items: flex-end">
      <div class="big-number">
        {{ visitCount ?? '—' }}
        <small>{{ visitCount === 1 ? 'visit recorded' : 'visits recorded' }}</small>
      </div>
      <button type="button" class="btn btn-primary" :disabled="recording" @click="recordVisit">
        <span v-if="recording" class="spinner"></span>I'm here today
      </button>
    </div>

    <p v-if="loading" class="notice"><span class="spinner"></span> Loading…</p>
    <div v-else-if="!visits.length" class="empty"><h3>No visits yet</h3><p>Tap “I'm here today” when you arrive.</p></div>
    <div v-else class="rows">
      <div v-for="v in visits" :key="v.id" class="row">
        <div class="row-main"><div class="row-title">{{ fmtDay(v.visited_at) }}</div></div>
        <span class="muted">{{ v.recorded_by === auth.user.id ? 'Checked in by you' : 'Recorded by staff' }}</span>
      </div>
    </div>
  </main>
</template>
