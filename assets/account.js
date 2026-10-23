import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'https://pgduryvupdltsqzqoiav.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_M2yLwUrQHDh-ikMOr8qS5A_gIkVgx94';
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

const signInForm = document.querySelector('[data-auth-form="sign-in"]');
const signUpForm = document.querySelector('[data-auth-form="sign-up"]');
const authMessage = document.querySelector('[data-auth-message]');
const authPanel = document.querySelector('[data-auth-panel]');
const signedOutPanel = document.querySelector('[data-signed-out]');
const accountEmail = document.querySelector('[data-account-email]');
const signOutButton = document.querySelector('[data-sign-out]');
const providerButtons = document.querySelectorAll('[data-provider]');

const setMessage = (message, type = 'info') => {
  if (!authMessage) return;
  authMessage.textContent = message;
  authMessage.dataset.type = type;
  authMessage.hidden = !message;
};

const setBusy = (form, busy) => {
  form?.querySelectorAll('button, input').forEach((element) => { element.disabled = busy; });
};

const renderSession = (session) => {
  const user = session?.user;
  if (user) {
    signedOutPanel.hidden = true;
    authPanel.hidden = false;
    accountEmail.textContent = user.email || 'Signed-in PublishRank account';
  } else {
    signedOutPanel.hidden = false;
    authPanel.hidden = true;
    accountEmail.textContent = '';
  }
};

signInForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  setBusy(signInForm, true);
  setMessage('Signing you in…');
  const data = new FormData(signInForm);
  const { error } = await supabase.auth.signInWithPassword({
    email: String(data.get('email') || '').trim(),
    password: String(data.get('password') || ''),
  });
  setBusy(signInForm, false);
  if (error) setMessage(error.message, 'error');
  else { signInForm.reset(); setMessage('Signed in. Your PublishRank account is ready to use in the plugin.', 'success'); }
});

signUpForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  setBusy(signUpForm, true);
  setMessage('Creating your account…');
  const data = new FormData(signUpForm);
  const email = String(data.get('email') || '').trim();
  const password = String(data.get('password') || '');
  const { data: result, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: window.location.href },
  });
  setBusy(signUpForm, false);
  if (error) setMessage(error.message, 'error');
  else if (result.session) { signUpForm.reset(); setMessage('Account created and signed in.', 'success'); }
  else { signUpForm.reset(); setMessage('Account created. Check your email to confirm it, then return here to sign in.', 'success'); }
});

providerButtons.forEach((button) => button.addEventListener('click', async () => {
  button.disabled = true;
  setMessage(`Opening ${button.dataset.provider} sign-in…`);
  const { error } = await supabase.auth.signInWithOAuth({
    provider: button.dataset.provider,
    options: { redirectTo: window.location.href },
  });
  if (error) { button.disabled = false; setMessage(error.message, 'error'); }
}));

signOutButton?.addEventListener('click', async () => {
  signOutButton.disabled = true;
  const { error } = await supabase.auth.signOut();
  signOutButton.disabled = false;
  setMessage(error ? error.message : 'You are signed out.', error ? 'error' : 'success');
});

supabase.auth.onAuthStateChange((_event, session) => renderSession(session));
const { data: { session } } = await supabase.auth.getSession();
renderSession(session);
