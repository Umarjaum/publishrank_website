import GoTrue from 'https://esm.sh/gotrue-js@1.0.1';

const auth = new GoTrue({ APIUrl: '/.netlify/identity', setCookie: true, clientName: 'publishrank-website' });
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
const setBusy = (form, busy) => form?.querySelectorAll('button, input').forEach((element) => { element.disabled = busy; });
const currentUser = async () => { try { return await auth.validateCurrentSession(); } catch { return null; } };
const renderUser = (user) => {
  signedOutPanel.hidden = Boolean(user);
  authPanel.hidden = !user;
  accountEmail.textContent = user?.email || '';
};
const syncProfile = async () => {
  try {
    const response = await fetch('/api/account-profile', { credentials: 'include' });
    if (!response.ok) return;
    const profile = await response.json();
    if (profile.email && accountEmail) accountEmail.textContent = profile.email;
  } catch { /* Account UI remains usable if profile storage is temporarily unavailable. */ }
};
const completeWordPressConnection = async (user) => {
  const params = new URLSearchParams(window.location.search);
  if (!user || params.get('connect') !== '1' || !params.get('return_url') || !params.get('site_url')) return;
  try {
    const target = new URL(params.get('return_url'));
    if (target.protocol !== 'https:') throw new Error('The WordPress callback must use HTTPS.');
    const response = await fetch('/api/plugin-connection', {
      method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ site_url: params.get('site_url') }),
    });
    const result = await response.json();
    if (!response.ok || !result.code) throw new Error(result.error || 'Could not create a WordPress connection code.');
    target.searchParams.set('code', result.code);
    if (params.get('state')) target.searchParams.set('state', params.get('state'));
    window.location.assign(target.toString());
  } catch (error) { setMessage(error?.message || 'WordPress connection failed.', 'error'); }
};

signInForm?.addEventListener('submit', async (event) => {
  event.preventDefault(); setBusy(signInForm, true); setMessage('Signing you in…');
  const data = new FormData(signInForm);
  try {
    await auth.login(String(data.get('email') || '').trim(), String(data.get('password') || ''), true);
    signInForm.reset(); setMessage('Signed in. Your PublishRank account is ready to use in the plugin.', 'success');
    const user = await currentUser(); renderUser(user); if (user) { await syncProfile(); await completeWordPressConnection(user); }
  } catch (error) { setMessage(error?.message || 'Sign-in failed.', 'error'); }
  setBusy(signInForm, false);
});

signUpForm?.addEventListener('submit', async (event) => {
  event.preventDefault(); setBusy(signUpForm, true); setMessage('Creating your account…');
  const data = new FormData(signUpForm);
  try {
    await auth.signup(String(data.get('email') || '').trim(), String(data.get('password') || ''));
    signUpForm.reset(); setMessage('Account created. Check your email to confirm it, then return here to sign in.', 'success');
  } catch (error) { setMessage(error?.message || 'Sign-up failed.', 'error'); }
  setBusy(signUpForm, false);
});

providerButtons.forEach((button) => button.addEventListener('click', () => {
  setMessage(`Opening ${button.dataset.provider} sign-in…`);
  window.location.assign(auth.loginExternalUrl(button.dataset.provider));
}));

signOutButton?.addEventListener('click', async () => {
  signOutButton.disabled = true;
  const user = auth.currentUser();
  try { if (user) await user.logout(); renderUser(null); setMessage('You are signed out.', 'success'); }
  catch (error) { setMessage(error?.message || 'Sign-out failed.', 'error'); }
  signOutButton.disabled = false;
});

try {
  const settings = await auth.settings();
  providerButtons.forEach((button) => {
    const enabled = Boolean(settings.external?.[button.dataset.provider]);
    button.hidden = !enabled;
    button.disabled = !enabled;
  });
  if (settings.disable_signup && signUpForm) signUpForm.hidden = true;
} catch { setMessage('Identity settings could not be loaded. Email sign-in may still be available.', 'error'); }

const user = await currentUser();
renderUser(user);
if (user) { await syncProfile(); await completeWordPressConnection(user); }
