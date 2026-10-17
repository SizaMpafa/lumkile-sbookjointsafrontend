<script setup>
import { ref, reactive, computed, watch, onMounted, nextTick } from 'vue';
import { api, post, patch, del, qs } from '../../api';
import { toast } from '../../toast';
import { askConfirm } from '../../confirm';
import { debounce, plural } from '../../utils';
import PageHero from '../../components/PageHero.vue';
import SegTabs from '../../components/SegTabs.vue';
import BookCard from '../../components/BookCard.vue';
import Modal from '../../components/Modal.vue';

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'available', label: 'Available' },
  { value: 'out', label: 'On loan' },
  { value: 'library_only', label: 'Library only' },
];
const LENGTHS = [
  { value: 'short', label: 'Short (about a week to read)' },
  { value: 'medium', label: 'Medium (about two weeks)' },
  { value: 'long', label: 'Long (about three weeks)' },
];

const filter = ref('all');
const q = ref('');
const books = ref([]);
const loading = ref(true);
const stats = ref(null);
const busyId = ref(null);

const showForm = ref(false);
const form = reactive({ title: '', author: '', length: 'medium', is_lendable: true });
const adding = ref(false);
const titleInput = ref(null);

const editing = ref(null); // the book being edited, or null
const editForm = reactive({ title: '', author: '', length: 'medium' });
const savingEdit = ref(false);

const filterParam = computed(() => (filter.value === 'out' ? 'requested,on_loan' : filter.value));

let seq = 0;
async function loadBooks() {
  const mine = ++seq;
  loading.value = true;
  try {
    const d = await api('/api/books' + qs({ filter: filterParam.value, q: q.value.trim(), limit: 500 }));
    if (mine === seq) books.value = d.books;
  } catch (err) {
    if (mine === seq) toast.error(err.message);
  } finally {
    if (mine === seq) loading.value = false;
  }
}
async function loadStats() {
  try { stats.value = await api('/api/books/stats'); } catch { /* the cards just stay blank */ }
}
const refresh = () => Promise.all([loadBooks(), loadStats()]);

async function addBook() {
  if (!form.title.trim() || !form.author.trim()) return toast.error('Enter the title and the author.');
  adding.value = true;
  try {
    await post('/api/books', { title: form.title, author: form.author, length: form.length, is_lendable: form.is_lendable });
    toast.success(`Added “${form.title.trim()}”.`);
    // keep the form open and keep length / lendable, so a whole shelf can be entered quickly
    form.title = '';
    form.author = '';
    await refresh();
    await nextTick();
    titleInput.value?.focus();
  } catch (err) {
    toast.error(err.message);
  } finally {
    adding.value = false;
  }
}

async function toggleLendable(book) {
  busyId.value = book.id;
  try {
    await patch(`/api/books/${book.id}/lendable`, { is_lendable: !book.is_lendable });
    toast.success(book.is_lendable ? `“${book.title}” is no longer up for lending.` : `“${book.title}” is now available to lend.`);
  } catch (err) {
    toast.error(err.message);
  } finally {
    busyId.value = null;
    await refresh();
  }
}

function openEdit(book) {
  editing.value = book;
  Object.assign(editForm, { title: book.title, author: book.author, length: book.length ?? 'medium' });
}
async function saveEdit() {
  savingEdit.value = true;
  try {
    await patch(`/api/books/${editing.value.id}`, { title: editForm.title, author: editForm.author, length: editForm.length });
    toast.success('Book updated.');
    editing.value = null;
    await refresh();
  } catch (err) {
    toast.error(err.message);
  } finally {
    savingEdit.value = false;
  }
}

async function remove(book) {
  const ok = await askConfirm({
    title: 'Delete this book?',
    message: `“${book.title}” will be removed from the catalog. Books that have ever been requested can't be deleted. Take those out of lending instead.`,
    confirmLabel: 'Delete',
    danger: true,
  });
  if (!ok) return;
  busyId.value = book.id;
  try {
    await del(`/api/books/${book.id}`);
    toast.success('Book deleted.');
  } catch (err) {
    toast.error(err.message);
  } finally {
    busyId.value = null;
    await refresh();
  }
}

const search = debounce(loadBooks, 300);
watch(q, search);
watch(filter, loadBooks);
onMounted(refresh);
</script>

<template>
  <PageHero title="The full catalog." dek="Every book Lumkile's owns lives here, lent out or not. Customers can browse all of it. The button on each book decides whether they can ask to borrow it.">
    <template #stats>
      <div class="stat"><span class="n">{{ stats?.total ?? '—' }}</span><span class="l">books in total</span></div>
      <div class="stat"><span class="n">{{ stats?.lendable ?? '—' }}</span><span class="l">in the lending pool</span></div>
      <div class="stat"><span class="n">{{ stats?.available ?? '—' }}</span><span class="l">available now</span></div>
      <div class="stat"><span class="n">{{ stats ? stats.requested + stats.on_loan : '—' }}</span><span class="l">requested or out</span></div>
    </template>
  </PageHero>

  <main class="wrap page">
    <div class="page-head">
      <div class="toolbar" style="margin: 0; flex: 1">
        <SegTabs v-model="filter" :options="FILTERS" />
        <input v-model="q" class="input grow" type="search" placeholder="Search title or author…" aria-label="Search books" />
      </div>
      <button type="button" class="btn" :class="showForm ? 'btn-ghost' : 'btn-primary'" @click="showForm = !showForm">
        {{ showForm ? 'Close' : 'Add a book' }}
      </button>
    </div>

    <form v-if="showForm" class="form-card" style="margin-bottom: 26px" novalidate @submit.prevent="addBook">
      <h3>Add a book</h3>
      <p class="form-note">The form stays open after each book so you can enter a whole shelf in one go.</p>
      <div class="field">
        <label for="b-title">Title</label>
        <input id="b-title" ref="titleInput" v-model="form.title" type="text" autocomplete="off" />
      </div>
      <div class="field">
        <label for="b-author">Author</label>
        <input id="b-author" v-model="form.author" type="text" autocomplete="off" />
      </div>
      <div class="field">
        <label for="b-length">Roughly how long is it?</label>
        <select id="b-length" v-model="form.length">
          <option v-for="l in LENGTHS" :key="l.value" :value="l.value">{{ l.label }}</option>
        </select>
        <p class="hint">Sets the suggested return date when you approve a request.</p>
      </div>
      <label class="check"><input v-model="form.is_lendable" type="checkbox" /> Available to lend out</label>
      <button class="btn btn-primary" type="submit" :disabled="adding">
        <span v-if="adding" class="spinner"></span>Add to catalog
      </button>
    </form>

    <p v-if="loading && !books.length" class="notice"><span class="spinner"></span> Loading…</p>
    <div v-else-if="!books.length" class="empty">
      <h3>{{ q || filter !== 'all' ? 'Nothing matches' : 'The catalog is empty' }}</h3>
      <p>{{ q || filter !== 'all' ? 'Try a different filter or search.' : 'Use “Add a book” to register your first one.' }}</p>
    </div>

    <div v-else class="shelf">
      <BookCard v-for="b in books" :key="b.id" :book="b">
        <template #actions>
          <button
            type="button"
            class="btn btn-sm"
            :class="b.is_lendable ? 'btn-ghost' : 'btn-primary'"
            :disabled="busyId === b.id || (b.is_lendable && b.status !== 'available')"
            :title="b.is_lendable && b.status !== 'available' ? 'It is requested or out on loan. Wait until it is back.' : ''"
            @click="toggleLendable(b)"
          >
            {{ b.is_lendable ? 'Mark unavailable' : 'Make available to lend' }}
          </button>
          <button type="button" class="btn btn-ghost btn-sm" @click="openEdit(b)">Edit</button>
          <button type="button" class="btn btn-danger btn-sm" :disabled="busyId === b.id" @click="remove(b)">Delete</button>
        </template>
      </BookCard>
    </div>

    <Modal v-if="editing" title="Edit book" @close="editing = null">
      <form novalidate @submit.prevent="saveEdit">
        <div class="field"><label for="e-title">Title</label><input id="e-title" v-model="editForm.title" type="text" /></div>
        <div class="field"><label for="e-author">Author</label><input id="e-author" v-model="editForm.author" type="text" /></div>
        <div class="field">
          <label for="e-length">Length</label>
          <select id="e-length" v-model="editForm.length"><option v-for="l in LENGTHS" :key="l.value" :value="l.value">{{ l.label }}</option></select>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-ghost" @click="editing = null">Cancel</button>
          <button type="submit" class="btn btn-primary" :disabled="savingEdit"><span v-if="savingEdit" class="spinner"></span>Save</button>
        </div>
      </form>
    </Modal>
  </main>
</template>
