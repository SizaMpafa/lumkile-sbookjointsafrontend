import { createRouter, createWebHistory } from 'vue-router';
import { useAuth } from './stores/auth';
import { homeFor } from './utils';

const routes = [
  { path: '/login', name: 'login', component: () => import('./views/LoginView.vue'), meta: { guest: true } },
  { path: '/account', name: 'account', component: () => import('./views/AccountView.vue'), meta: { auth: true } },

  // customer portal
  { path: '/shelf', name: 'shelf', component: () => import('./views/customer/ShelfView.vue'), meta: { role: 'customer' } },
  { path: '/my-visits', name: 'my-visits', component: () => import('./views/customer/MyVisitsView.vue'), meta: { role: 'customer' } },
  { path: '/my-loans', name: 'my-loans', component: () => import('./views/customer/MyLoansView.vue'), meta: { role: 'customer' } },

  // staff portal
  { path: '/staff/requests', name: 'requests', component: () => import('./views/staff/RequestsView.vue'), meta: { role: 'staff' } },
  { path: '/staff/catalog', name: 'catalog', component: () => import('./views/staff/CatalogView.vue'), meta: { role: 'staff' } },
  { path: '/staff/visitors', name: 'visitors', component: () => import('./views/staff/VisitorsView.vue'), meta: { role: 'staff' } },
  { path: '/staff/attendance', name: 'attendance', component: () => import('./views/staff/AttendanceView.vue'), meta: { role: 'staff' } },
  { path: '/staff/accounts', name: 'accounts', component: () => import('./views/staff/AccountsView.vue'), meta: { role: 'staff' } },

  { path: '/', name: 'home', component: { render: () => null }, meta: { auth: true } },
  { path: '/:pathMatch(.*)*', name: 'not-found', component: () => import('./views/NotFoundView.vue') },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
});

// One login for everyone: the account's role (from the users table) decides which portal opens.
router.beforeEach(async (to) => {
  const auth = useAuth();
  await auth.whenReady();

  if (to.meta.guest) return auth.isAuthed ? homeFor(auth.user) : true;

  if (to.meta.auth || to.meta.role) {
    if (!auth.isAuthed) return { name: 'login', query: to.fullPath !== '/' ? { next: to.fullPath } : {} };
    // a freshly emailed (temporary) password must be replaced before anything else
    if (auth.mustChange && to.name !== 'account') return { name: 'account' };
    if (to.name === 'home') return homeFor(auth.user);
    if (to.meta.role && to.meta.role !== auth.user.role) return homeFor(auth.user);
  }
  return true;
});
