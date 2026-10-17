import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import { router } from './router';
import { useAuth } from './stores/auth';
import { onSessionExpired } from './api';
import { initTheme } from './theme';
import './styles.css';

initTheme();

const app = createApp(App);
app.use(createPinia());
app.use(router);

// If the server says the session is dead and a refresh didn't help, send them back to log in.
onSessionExpired(() => {
  useAuth().reset();
  if (router.currentRoute.value.name !== 'login') router.replace({ name: 'login', query: { expired: '1' } });
});

app.mount('#app');
