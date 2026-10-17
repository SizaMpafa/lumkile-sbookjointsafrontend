<script setup>
import { ref, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { useAuth } from '../stores/auth';
import { api, patch } from '../api';
import { toast } from '../toast';
import { homeFor } from '../utils';
import PageHero from '../components/PageHero.vue';

const auth = useAuth();
const router = useRouter();

// your details
const details = reactive({ full_name: auth.user.full_name, phone: auth.user.phone });
const savingDetails = ref(false);

async function saveDetails() {
  savingDetails.value = true;
  try {
    const d = await patch(`/api/users/${auth.user.id}`, { full_name: details.full_name, phone: details.phone });
    auth.applyUser(d.user, auth.mustChange);
    details.full_name = d.user.full_name;
    details.phone = d.user.phone;
    toast.success('Your details were saved.');
  } catch (err) {
    toast.error(err.message);
  } finally {
    savingDetails.value = false;
  }
}

// password
const pw = reactive({ current: '', next: '', again: '' });
const pwError = ref('');
const savingPw = ref(false);

async function savePassword() {
  pwError.value = '';
  if (!pw.current) return (pwError.value = 'Enter your current password.');
  if (pw.next.length < 8) return (pwError.value = 'Your new password needs at least 8 characters.');
  if (pw.next !== pw.again) return (pwError.value = "The two new passwords don't match.");
  if (pw.next === pw.current) return (pwError.value = 'Choose a password different from the current one.');

  savingPw.value = true;
  const wasForced = auth.mustChange;
  try {
    await auth.changePassword(pw.current, pw.next);
    pw.current = pw.next = pw.again = '';
    toast.success('Password changed.');
    if (wasForced) router.replace(homeFor(auth.user));
  } catch (err) {
    pwError.value = err.message;
  } finally {
    savingPw.value = false;
  }
}
</script>

<template>
  <PageHero
    :title="auth.mustChange ? 'Choose your own password.' : 'Your account.'"
    :dek="auth.mustChange ? 'The password in your email was temporary. Set a new one to continue.' : 'Update your details or change your password.'"
  />

  <main class="wrap page">
    <div v-if="auth.mustChange" class="callout" role="alert">
      <strong>One quick step.</strong> You must change the temporary password before using the Book Joint.
    </div>

    <div class="form-card" style="margin-bottom: 26px">
      <h3>Change password</h3>
      <p class="form-note">At least 8 characters.</p>
      <form novalidate @submit.prevent="savePassword">
        <div class="field">
          <label for="pw-current">{{ auth.mustChange ? 'Temporary password (from your email)' : 'Current password' }}</label>
          <input id="pw-current" v-model="pw.current" type="password" autocomplete="current-password" />
        </div>
        <div class="field">
          <label for="pw-new">New password</label>
          <input id="pw-new" v-model="pw.next" type="password" autocomplete="new-password" />
        </div>
        <div class="field">
          <label for="pw-again">New password again</label>
          <input id="pw-again" v-model="pw.again" type="password" autocomplete="new-password" />
        </div>
        <p v-if="pwError" class="form-error" role="alert">{{ pwError }}</p>
        <button class="btn btn-primary" type="submit" :disabled="savingPw">
          <span v-if="savingPw" class="spinner"></span>Save new password
        </button>
      </form>
    </div>

    <div v-if="!auth.mustChange" class="form-card">
      <h3>Your details</h3>
      <p class="form-note">Your email ({{ auth.user.email }}) can only be changed by staff.</p>
      <form novalidate @submit.prevent="saveDetails">
        <div class="field">
          <label for="d-name">Full name</label>
          <input id="d-name" v-model="details.full_name" type="text" autocomplete="name" />
        </div>
        <div class="field">
          <label for="d-phone">Phone</label>
          <input id="d-phone" v-model="details.phone" type="tel" autocomplete="tel" />
        </div>
        <button class="btn btn-primary" type="submit" :disabled="savingDetails">
          <span v-if="savingDetails" class="spinner"></span>Save details
        </button>
      </form>
    </div>
  </main>
</template>
