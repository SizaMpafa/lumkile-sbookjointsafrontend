<script setup>
import { ref, reactive, computed, watch, onMounted } from 'vue';
import { api, post, patch, qs } from '../../api';
import { toast } from '../../toast';
import { askConfirm } from '../../confirm';
import { debounce, fmtDate, plural } from '../../utils';
import PageHero from '../../components/PageHero.vue';
import SegTabs from '../../components/SegTabs.vue';
import Modal from '../../components/Modal.vue';

const MODES = [
  { value: 'find', label: 'Find a visitor' },
  { value: 'new', label: 'New visitor' },
];
const mode = ref('find');

/* ---------------------------------------------------------------- finding */
const q = ref('');
const results = ref([]);
const recent = ref([]);
const recentCount = ref(0);
const loading = ref(true);
const busyId = ref(null);
const history = reactive({}); // person id -> { loading, dates } while the history is open

const searching = computed(() => q.value.trim().length >= 2);
const rows = computed(() => (searching.value ? results.value : recent.value));

let seq = 0;
async function runSearch() {
  const mine = ++seq;
  if (!searching.value) { results.value = []; return; }
  loading.value = true;
  try {
    const d = await api('/api/visitors/search' + qs({ q: q.value.trim() }));
    if (mine === seq) results.value = d.results;
  } catch (err) {
    if (mine === seq) toast.error(err.message);
  } finally {
    if (mine === seq) loading.value = false;
  }
}
async function loadRecent(more = false) {
  loading.value = true;
  try {
    const d = await api('/api/visitors' + qs({ limit: 25, offset: more ? recent.value.length : 0 }));
    recent.value = more ? [...recent.value, ...d.people] : d.people;
    recentCount.value = d.count;
  } catch (err) {
    toast.error(err.message);
  } finally {
    loading.value = false;
  }
}

const debouncedSearch = debounce(runSearch, 350);
watch(q, () => { debouncedSearch(); });

// replace one person everywhere it appears, so counts and buttons update in place
function replacePerson(person) {
  for (const list of [results, recent]) {
    const i = list.value.findIndex((p) => p.id === person.id);
    if (i >= 0) list.value[i] = person;
  }
}
async function refreshPerson(id) {
  try {
    const d = await api(`/api/visitors/${id}`);
    replacePerson(d.person);
    if (history[id]) history[id].dates = d.attendances.map((a) => a.visited_at);
  } catch (err) {
    toast.error(err.message);
  }
}

function statusOf(p) {
  if (p.is_registered) return { kind: 'pending', label: 'Has an account' };
  if (p.can_register) return { kind: 'ready', label: 'Ready to register' };
  return { kind: 'reference', label: `Needs ${plural(p.visits_needed, 'more visit')}` };
}

async function recordVisit(p) {
  busyId.value = p.id;
  try {
    const d = await post('/api/attendances', { person_id: p.id });
    toast.success(`Visit recorded for ${p.full_name} (${plural(d.visit_count, 'visit')} so far).`);
  } catch (err) {
    err.status === 409 ? toast.info(`${p.full_name} is already checked in for today.`) : toast.error(err.message);
  } finally {
    busyId.value = null;
    await refreshPerson(p.id);
  }
}

async function register(p) {
  const ok = await askConfirm({
    title: `Create an account for ${p.full_name}?`,
    message: `A login with a random password will be emailed to ${p.email}. Their ${plural(p.visit_count, 'visit')} carry over automatically.`,
    confirmLabel: 'Create account',
  });
  if (!ok) return;
  busyId.value = p.id;
  try {
    const d = await post('/api/users/customers', { person_id: p.id });
    toast.success(d.message);
  } catch (err) {
    toast.error(err.message);
  } finally {
    busyId.value = null;
    await refreshPerson(p.id);
  }
}

async function toggleHistory(p) {
  if (history[p.id]) { delete history[p.id]; return; }
  history[p.id] = { dates: [] };
  await refreshPerson(p.id);
}

/* ---------------------------------------------------------------- editing */
const editing = ref(null);
const editForm = reactive({ full_name: '', phone: '', email: '' });
const savingEdit = ref(false);

function openEdit(p) {
  editing.value = p;
  Object.assign(editForm, { full_name: p.full_name, phone: p.phone, email: p.email });
}
async function saveEdit() {
  savingEdit.value = true;
  try {
    const d = await patch(`/api/visitors/${editing.value.id}`, { ...editForm });
    replacePerson(d.person);
    toast.success('Details updated.');
    editing.value = null;
  } catch (err) {
    toast.error(err.message);
  } finally {
    savingEdit.value = false;
  }
}

/* ------------------------------------------------------------ new visitor */
const form = reactive({ full_name: '', phone: '', email: '' });
const creating = ref(false);
const matches = ref(null); // possible duplicates the server found

async function createVisitor(confirmNew = false) {
  if (!form.full_name.trim() || !form.phone.trim() || !form.email.trim()) return toast.error('Enter the name, phone number and email.');
  creating.value = true;
  try {
    const d = await post('/api/visitors', { ...form, confirm_new: confirmNew || undefined });
    toast.success(`${d.person.full_name} added and their first visit recorded.`);
    Object.assign(form, { full_name: '', phone: '', email: '' });
    matches.value = null;
    await loadRecent();
  } catch (err) {
    if (err.status === 409 && err.details?.matches) matches.value = err.details.matches;
    else toast.error(err.message);
  } finally {
    creating.value = false;
  }
}

async function recordForMatch(p) {
  await recordVisit(p);
  matches.value = null;
  Object.assign(form, { full_name: '', phone: '', email: '' });
  await loadRecent();
}

onMounted(() => loadRecent());
</script>

<template>
  <PageHero title="Visitors." dek="Everyone who has been to a session. Find someone first, and only add them as new if they're not on file. Two recorded visits unlock an account.">
    <template #stats>
      <div class="stat"><span class="n">{{ recentCount || '—' }}</span><span class="l">people on file</span></div>
    </template>
  </PageHero>

  <main class="wrap page">
    <div class="toolbar"><SegTabs v-model="mode" :options="MODES" /></div>

    <!-- FIND -->
    <template v-if="mode === 'find'">
      <div class="toolbar">
        <input v-model="q" class="input grow" type="search" placeholder="Search by name, phone or email…" aria-label="Search visitors" />
      </div>

      <h2 class="group-title" style="margin-top: 6px">{{ searching ? 'Search results' : 'Recently added' }}</h2>
      <p v-if="loading && !rows.length" class="notice"><span class="spinner"></span> Loading…</p>
      <div v-else-if="!rows.length" class="empty">
        <h3>{{ searching ? 'No one by that name' : 'No visitors yet' }}</h3>
        <p>{{ searching ? 'Check the spelling, or add them as a new visitor.' : 'Add the first one with “New visitor”.' }}</p>
        <button type="button" class="btn btn-primary" style="margin-top: 14px" @click="mode = 'new'">New visitor</button>
      </div>

      <div v-else class="rows">
        <div v-for="p in rows" :key="p.id" class="row">
          <div class="row-main">
            <div class="row-title">{{ p.full_name }}</div>
            <div class="row-sub">{{ p.phone }} · {{ p.email }}</div>
            <div class="pills" style="margin-top: 8px">
              <span class="pill" :class="statusOf(p).kind">{{ statusOf(p).label }}</span>
              <span class="meta">{{ plural(p.visit_count, 'visit') }}</span>
            </div>
          </div>
          <div class="row-actions">
            <button type="button" class="btn btn-ghost btn-sm" @click="toggleHistory(p)">{{ history[p.id] ? 'Hide visits' : 'Visits' }}</button>
            <button v-if="!p.is_registered" type="button" class="btn btn-ghost btn-sm" @click="openEdit(p)">Edit</button>
            <button type="button" class="btn btn-ghost btn-sm" :disabled="busyId === p.id" @click="recordVisit(p)">Record visit</button>
            <button
              v-if="!p.is_registered"
              type="button"
              class="btn btn-primary btn-sm"
              :disabled="!p.can_register || busyId === p.id"
              :title="p.can_register ? '' : `Needs ${plural(p.visits_needed, 'more visit')} before an account can be created`"
              @click="register(p)"
            >Register as customer</button>
          </div>
          <div v-if="history[p.id]" class="row-extra">
            <div v-if="!history[p.id].dates.length">Loading…</div>
            <div v-else class="dates"><span v-for="(d, i) in history[p.id].dates" :key="i">{{ fmtDate(d, true) }}</span></div>
          </div>
        </div>
      </div>
      <button v-if="!searching && recent.length < recentCount" type="button" class="btn btn-ghost" style="margin-top: 16px" :disabled="loading" @click="loadRecent(true)">Load more</button>
    </template>

    <!-- NEW -->
    <template v-else>
      <form class="form-card" novalidate @submit.prevent="createVisitor(false)">
        <h3>New visitor</h3>
        <p class="form-note">Adds them to the list and records their first visit today. Their details are used later to create their account.</p>
        <div class="field"><label for="v-name">Full name</label><input id="v-name" v-model="form.full_name" type="text" autocomplete="off" /></div>
        <div class="grid-2">
          <div class="field"><label for="v-phone">Phone number</label><input id="v-phone" v-model="form.phone" type="tel" autocomplete="off" /></div>
          <div class="field"><label for="v-email">Email</label><input id="v-email" v-model="form.email" type="email" autocomplete="off" /></div>
        </div>
        <p class="hint muted" style="margin: -4px 0 14px; font-size: 12.5px">Double-check the email, because their login password is sent there.</p>
        <button class="btn btn-primary" type="submit" :disabled="creating">
          <span v-if="creating" class="spinner"></span>Add visitor &amp; record first visit
        </button>
      </form>

      <div v-if="matches" class="callout warn" style="margin-top: 22px" role="alert">
        <strong>Is this someone already on file?</strong> A person with the same phone number or email exists.
        <div class="rows" style="margin-top: 12px">
          <div v-for="p in matches" :key="p.id" class="row" style="padding: 12px 0">
            <div class="row-main">
              <div class="row-title">{{ p.full_name }}</div>
              <div class="row-sub">{{ p.phone }} · {{ p.email }} · {{ plural(p.visit_count, 'visit') }}</div>
            </div>
            <button type="button" class="btn btn-primary btn-sm" :disabled="busyId === p.id" @click="recordForMatch(p)">Record a visit for them</button>
          </div>
        </div>
        <div class="modal-actions" style="justify-content: flex-start">
          <button type="button" class="btn btn-ghost btn-sm" :disabled="creating" @click="createVisitor(true)">No, this is a different person. Add anyway</button>
        </div>
      </div>
    </template>

    <Modal v-if="editing" title="Edit visitor details" @close="editing = null">
      <form novalidate @submit.prevent="saveEdit">
        <div class="field"><label for="ev-name">Full name</label><input id="ev-name" v-model="editForm.full_name" type="text" /></div>
        <div class="field"><label for="ev-phone">Phone</label><input id="ev-phone" v-model="editForm.phone" type="tel" /></div>
        <div class="field"><label for="ev-email">Email</label><input id="ev-email" v-model="editForm.email" type="email" /></div>
        <div class="modal-actions">
          <button type="button" class="btn btn-ghost" @click="editing = null">Cancel</button>
          <button type="submit" class="btn btn-primary" :disabled="savingEdit"><span v-if="savingEdit" class="spinner"></span>Save</button>
        </div>
      </form>
    </Modal>
  </main>
</template>
