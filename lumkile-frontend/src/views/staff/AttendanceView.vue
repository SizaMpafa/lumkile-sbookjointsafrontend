<script setup>
import { ref, watch, onMounted } from 'vue';
import { api, qs } from '../../api';
import { toast } from '../../toast';
import { todayISO, fmtDay, plural } from '../../utils';
import PageHero from '../../components/PageHero.vue';

const date = ref(todayISO());
const attendances = ref([]);
const loading = ref(true);

let seq = 0;
async function load() {
  const mine = ++seq;
  loading.value = true;
  try {
    const d = await api('/api/attendances' + qs({ date: date.value }));
    if (mine === seq) attendances.value = d.attendances;
  } catch (err) {
    if (mine === seq) toast.error(err.message);
  } finally {
    if (mine === seq) loading.value = false;
  }
}

watch(date, () => { if (date.value) load(); });
onMounted(load);
</script>

<template>
  <PageHero title="Who came in." dek="The attendance register for any day. Record visits from the Visitors page.">
    <template #stats>
      <div class="stat"><span class="n">{{ loading ? '—' : attendances.length }}</span><span class="l">{{ date === todayISO() ? 'checked in today' : 'checked in that day' }}</span></div>
    </template>
  </PageHero>

  <main class="wrap page">
    <div class="toolbar">
      <div class="field" style="margin: 0">
        <label class="sr-only" for="att-date">Date</label>
        <input id="att-date" v-model="date" type="date" :max="todayISO()" />
      </div>
      <button v-if="date !== todayISO()" type="button" class="btn btn-ghost btn-sm" @click="date = todayISO()">Today</button>
      <span class="muted">{{ fmtDay(date) }}</span>
    </div>

    <p v-if="loading && !attendances.length" class="notice"><span class="spinner"></span> Loading…</p>
    <div v-else-if="!attendances.length" class="empty"><h3>No one checked in</h3><p>Nobody has been recorded for this day.</p></div>
    <div v-else class="rows">
      <div v-for="a in attendances" :key="a.id" class="row">
        <div class="row-main">
          <div class="row-title">{{ a.person.full_name }}</div>
          <div class="row-sub">{{ a.person.phone }} · {{ a.person.email }}</div>
        </div>
        <span class="muted">{{ a.recorder ? `Recorded by ${a.recorder.full_name}` : 'Recorded' }}</span>
      </div>
      <p class="notice">{{ plural(attendances.length, 'person', 'people') }} on this day.</p>
    </div>
  </main>
</template>
