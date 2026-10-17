<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { api, post, qs } from '../../api';
import { toast } from '../../toast';
import { debounce, dueInfo } from '../../utils';
import PageHero from '../../components/PageHero.vue';
import SegTabs from '../../components/SegTabs.vue';
import BookCard from '../../components/BookCard.vue';

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'available', label: 'Available' },
  { value: 'out', label: 'On loan' },
  { value: 'library_only', label: 'Library only' },
];

const filter = ref('all');
const q = ref('');
const books = ref([]);
const loading = ref(true);
const stats = ref(null);
const visitCount = ref(null);
const openRequests = ref([]);
const requesting = ref(null);

const filterParam = computed(() => (filter.value === 'out' ? 'requested,on_loan' : filter.value));

// my pending requests / active loans, keyed by book id
const mineByBook = computed(() => new Map(openRequests.value.map((r) => [r.book_id, r])));

let seq = 0; // ignore results from an older search that finishes late
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

async function loadMeta() {
  const [s, v, r] = await Promise.allSettled([
    api('/api/books/stats'),
    api('/api/attendances/me'),
    api('/api/loan-requests/mine' + qs({ status: 'open', limit: 200 })),
  ]);
  if (s.status === 'fulfilled') stats.value = s.value;
  if (v.status === 'fulfilled') visitCount.value = v.value.visit_count;
  if (r.status === 'fulfilled') openRequests.value = r.value.requests;
}

function pillFor(book) {
  const mine = mineByBook.value.get(book.id);
  if (!mine) return null;
  return mine.decision === 'pending'
    ? { kind: 'pending', label: 'You requested this' }
    : { kind: 'loan', label: 'You have this' };
}

function noteFor(book) {
  const mine = mineByBook.value.get(book.id);
  if (mine?.decision === 'pending') return { text: 'Waiting for staff to approve it.' };
  if (mine?.decision === 'approved') {
    const due = dueInfo(mine.due_date);
    return { text: due.text, warn: due.overdue };
  }
  if (!book.is_lendable) return { text: 'Browse only. Not available to borrow.' };
  if (book.status === 'requested') return { text: "Someone has asked for this one. It'll be free again if they're declined." };
  if (book.status === 'on_loan') return { text: 'Out on loan right now.' };
  return null;
}

async function request(book) {
  requesting.value = book.id;
  try {
    await post('/api/loan-requests', { book_id: book.id });
    toast.success(`Requested “${book.title}”. Staff will review it.`);
  } catch (err) {
    toast.error(err.message);
  } finally {
    requesting.value = null;
    await Promise.all([loadBooks(), loadMeta()]);
  }
}

const search = debounce(loadBooks, 300);
watch(q, search);
watch(filter, loadBooks);
onMounted(() => { loadBooks(); loadMeta(); });
</script>

<template>
  <PageHero title="What's on the shelf, right now." dek="See what's free, ask to borrow what you want, and keep track of your own visits. No more notebook at the counter.">
    <template #stats>
      <div class="stat"><span class="n">{{ stats?.total ?? '—' }}</span><span class="l">books in the collection</span></div>
      <div class="stat"><span class="n">{{ stats?.available ?? '—' }}</span><span class="l">available to borrow</span></div>
      <div class="stat"><span class="n">{{ visitCount ?? '—' }}</span><span class="l">your visits</span></div>
    </template>
  </PageHero>

  <main class="wrap page">
    <div class="toolbar">
      <SegTabs v-model="filter" :options="FILTERS" />
      <input v-model="q" class="input grow" type="search" placeholder="Search title or author…" aria-label="Search books" />
    </div>

    <p v-if="loading && !books.length" class="notice"><span class="spinner"></span> Loading the shelf…</p>
    <div v-else-if="!books.length" class="empty">
      <h3>Nothing here</h3>
      <p>{{ q ? 'No books match that search.' : 'No books in this view yet.' }}</p>
    </div>

    <div v-else class="shelf">
      <BookCard v-for="b in books" :key="b.id" :book="b" :pill-override="pillFor(b)">
        <template #note>
          <p v-if="noteFor(b)" class="book-note" :class="{ warn: noteFor(b).warn }">{{ noteFor(b).text }}</p>
        </template>
        <template #actions>
          <button
            v-if="b.is_lendable && b.status === 'available' && !mineByBook.has(b.id)"
            type="button"
            class="btn btn-primary btn-sm"
            :disabled="requesting === b.id"
            @click="request(b)"
          >
            <span v-if="requesting === b.id" class="spinner"></span>Request to borrow
          </button>
        </template>
      </BookCard>
    </div>
  </main>
</template>
