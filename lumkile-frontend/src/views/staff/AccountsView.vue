<script setup>
import { ref, reactive, watch, onMounted } from 'vue';
import { api, post, qs } from '../../api';
import { toast } from '../../toast';
import { askConfirm } from '../../confirm';
import { debounce, fmtDate, fmtDay, dueInfo, plural } from '../../utils';
import PageHero from '../../components/PageHero.vue';
import SegTabs from '../../components/SegTabs.vue';
import Modal from '../../components/Modal.vue';

const ROLES = [
  { value: 'all', label: 'Everyone' },
  { value: 'customer', label: 'Customers' },
  { value: 'staff', label: 'Staff' },
];

const role = ref('all');
const q = ref('');
const users = ref([]);
const count = ref(0);
const loading = ref(true);
const busyId = ref(null);

let seq = 0;
async function load() {
  const mine = ++seq;
  loading.value = true;
  try {
    const d = await api('/api/users' + qs({ role: role.value === 'all' ? undefined : role.value, q: q.value.trim(), limit: 100 }));
    if (mine === seq) { users.value = d.users; count.value = d.count; }
  } catch (err) {
    if (mine === seq) toast.error(err.message);
  } finally {
    if (mine === seq) loading.value = false;
  }
}

async function resetPassword(u) {
  const ok = await askConfirm({
    title: `Reset ${u.full_name}'s password?`,
    message: `A new random password will be emailed to ${u.email}. Their old password stops working straight away.`,
    confirmLabel: 'Send new password',
    danger: true,
  });
  if (!ok) return;
  busyId.value = u.id;
  try {
    const d = await post(`/api/users/${u.id}/reset-password`);
    toast.success(d.message);
  } catch (err) {
    toast.error(err.message);
  } finally {
    busyId.value = null;
  }
}

/* ------------------------------------------------------------- add staff */
const showForm = ref(false);
const form = reactive({ full_name: '', phone: '', email: '' });
const creating = ref(false);

async function createStaff() {
  if (!form.full_name.trim() || !form.phone.trim() || !form.email.trim()) return toast.error('Enter the name, phone number and email.');
  creating.value = true;
  try {
    const d = await post('/api/users/staff', { ...form });
    toast.success(d.message);
    Object.assign(form, { full_name: '', phone: '', email: '' });
    showForm.value = false;
    await load();
  } catch (err) {
    toast.error(err.message);
  } finally {
    creating.value = false;
  }
}

/* --------------------------------------------------------------- profile */
const profile = ref(null);
const profileLoading = ref(false);

async function openProfile(u) {
  profile.value = { user: u };
  profileLoading.value = true;
  try {
    profile.value = await api(`/api/users/${u.id}/profile`);
  } catch (err) {
    toast.error(err.message);
    profile.value = null;
  } finally {
    profileLoading.value = false;
  }
}

const search = debounce(load, 300);
watch(q, search);
watch(role, load);
onMounted(load);
</script>

<template>
  <PageHero title="Accounts." dek="Everyone with a login: staff and customers. Customers are created from the Visitors page once they have enough visits.">
    <template #stats>
      <div class="stat"><span class="n">{{ loading && !users.length ? '—' : count }}</span><span class="l">{{ role === 'all' ? 'accounts' : role === 'staff' ? 'staff accounts' : 'customer accounts' }}</span></div>
    </template>
  </PageHero>

  <main class="wrap page">
    <div class="page-head">
      <div class="toolbar" style="margin: 0; flex: 1">
        <SegTabs v-model="role" :options="ROLES" />
        <input v-model="q" class="input grow" type="search" placeholder="Search name, email or phone…" aria-label="Search accounts" />
      </div>
      <button type="button" class="btn" :class="showForm ? 'btn-ghost' : 'btn-primary'" @click="showForm = !showForm">{{ showForm ? 'Close' : 'Add staff' }}</button>
    </div>

    <form v-if="showForm" class="form-card" style="margin-bottom: 26px" novalidate @submit.prevent="createStaff">
      <h3>Add a staff member</h3>
      <p class="form-note">They get an email with a random password and must change it the first time they log in.</p>
      <div class="field"><label for="s-name">Full name</label><input id="s-name" v-model="form.full_name" type="text" autocomplete="off" /></div>
      <div class="grid-2">
        <div class="field"><label for="s-phone">Phone</label><input id="s-phone" v-model="form.phone" type="tel" autocomplete="off" /></div>
        <div class="field"><label for="s-email">Email</label><input id="s-email" v-model="form.email" type="email" autocomplete="off" /></div>
      </div>
      <button class="btn btn-primary" type="submit" :disabled="creating"><span v-if="creating" class="spinner"></span>Create account &amp; email login</button>
    </form>

    <p v-if="loading && !users.length" class="notice"><span class="spinner"></span> Loading…</p>
    <div v-else-if="!users.length" class="empty"><h3>No accounts found</h3><p>Try a different search.</p></div>
    <div v-else class="rows">
      <div v-for="u in users" :key="u.id" class="row">
        <div class="row-main">
          <div class="row-title">{{ u.full_name }} <span class="role-tag" style="vertical-align: middle">{{ u.role }}</span></div>
          <div class="row-sub">{{ u.email }} · {{ u.phone }} · since {{ fmtDate(u.created_at, true) }}</div>
        </div>
        <div class="row-actions">
          <button type="button" class="btn btn-ghost btn-sm" @click="openProfile(u)">Profile</button>
          <button type="button" class="btn btn-danger btn-sm" :disabled="busyId === u.id" @click="resetPassword(u)">Reset password</button>
        </div>
      </div>
    </div>

    <Modal v-if="profile" :title="profile.user.full_name" @close="profile = null">
      <p class="muted">{{ profile.user.email }} · {{ profile.user.phone }}</p>
      <p v-if="profileLoading" class="notice"><span class="spinner"></span> Loading…</p>
      <template v-else-if="profile.user.role === 'customer'">
        <div class="big-number" style="margin: 18px 0 6px">{{ profile.visit_count ?? 0 }}<small>{{ profile.visit_count === 1 ? 'visit' : 'visits' }}</small></div>
        <div v-if="profile.recent_attendances?.length" class="dates" style="margin-bottom: 14px">
          <span v-for="a in profile.recent_attendances" :key="a.id">{{ fmtDate(a.visited_at) }}</span>
        </div>
        <h4 style="margin: 14px 0 6px; font-size: 15px">Open requests &amp; loans</h4>
        <p v-if="!profile.open_requests?.length" class="muted">Nothing open right now.</p>
        <div v-for="r in profile.open_requests" :key="r.id" class="row" style="padding: 10px 0">
          <div class="row-main"><div class="row-title" style="font-size: 15px">{{ r.book.title }}</div></div>
          <span class="pill" :class="r.decision === 'pending' ? 'pending' : dueInfo(r.due_date).overdue ? 'loan' : 'available'">
            {{ r.decision === 'pending' ? 'Pending' : dueInfo(r.due_date).text }}
          </span>
        </div>
      </template>
      <p v-else class="muted" style="margin-top: 14px">Staff account.</p>
      <div class="modal-actions"><button type="button" class="btn btn-ghost" @click="profile = null">Close</button></div>
    </Modal>
  </main>
</template>
