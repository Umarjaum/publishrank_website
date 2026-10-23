import {
  getUser,
  handleAuthCallback,
  login,
  logout,
  oauthLogin,
  signup,
} from 'https://esm.sh/@netlify/identity@2.0.0';

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

const renderUser = (user) => {
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

const syncProfile = async () => {
  try {
    const response = await fetch('/api/account-profile', { credentials: 'include' });
    if (!response.ok) return;
    const profile = await response.json();
    if (profile.email && accountEmail) accountEmail.textContent = profile.email;
  } catch { /* The account UI remains usable if profile storage is temporarily unavailable. */ }
};

signInForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  setBusy(signInForm, true); setMessage('Signing you in…');
  const data = new FormData(signInForm);
  try {
    await login(String(data.get('email') || '').trim(), String(data.get('password') || ''));
    signInForm.reset(); setMessage('Signed in. Your PublishRank account is ready to use in the plugin.', 'success');
    renderUser(await getUser()); await syncProfile();
  } catch (error) { setMessage(error?.message || 'Sign-in failed.', 'error'); }
  setBusy(signInForm, false);
});

signUpForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  setBusy(signUpForm, true); setMessage('Creating your account…');
  const data = new FormData(signUpForm);
  try {
    await signup(String(data.get('email') || '').trim(), String(data.get('password') || ''));
    signUpForm.reset();
    setMessage('Account created. Check your email to confirm it, then return here to sign in.', 'success');
  } catch (error) { setMessage(error?.message || 'Sign-up failed.', 'error'); }
  setBusy(signUpForm, false);
});

providerButtons.forEach((button) => button.addEventListener('click', async () => {
  button.disabled = true; setMessage(`Opening ${button.dataset.provider} sign-in…`);
  try { await oauthLogin(button.dataset.provider); }
  catch (error) { button.disabled = false; setMessage(error?.message || 'Provider sign-in failed.', 'error'); }
}));

signOutButton?.addEventListener('click', async () => {
  signOutButton.disabled = true;
  try { await logout(); renderUser(null); setMessage('You are signed out.', 'success'); }
  catch (error) { setMessage(error?.message || 'Sign-out failed.', 'error'); }
  signOutButton.disabled = false;
});

const completeWordPressConnection = async () => {
  const params = new URLSearchParams(window.location.search);
  if (params.get('connect') !== '1' || !params.get('return_url') || !params.get('site_url')) return;
  const returnUrl = params.get('return_url');
  try {
    const target = new URL(returnUrl);
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

await handleAuthCallback();
const user = await getUser();
renderUser(user);
if (user) { await syncProfile(); await completeWordPressConnection(); }
