import './style.css';
import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import type { Clerk as ClerkClient } from '@clerk/clerk-js';
import { Dashboard } from './components/dashboard';
import { ErrorScreen, HomeScreen, LoadingScreen, SignInScreen, UploadScreen } from './screens';
import type { Dashboard as DashboardData } from './types';

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('App root is missing');
const root = createRoot(app);
let clerk: ClerkClient | null = null;
type ClerkUICtor = NonNullable<NonNullable<Parameters<ClerkClient['load']>[0]>['ui']>['ClerkUI'];

function renderHome(): void {
  root.render(createElement(HomeScreen));
}

function render(data: DashboardData): void {
  root.render(createElement(Dashboard, {
    data,
    onSignOut: signOut,
  }));
}

async function signOut(): Promise<void> {
  await clerk?.signOut();
  window.location.assign('/');
}

function renderSignIn(): void {
  if (!clerk) return;
  root.render(createElement(SignInScreen, { clerk }));
}

async function loadClerkUi(publishableKey: string): Promise<ClerkUICtor> {
  const encodedFrontendApi = publishableKey.split('_')[2];
  if (!encodedFrontendApi) throw new Error('The Clerk publishable key is invalid.');
  const frontendApi = atob(encodedFrontendApi).replace(/\$$/, '');
  await new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://${frontendApi}/npm/@clerk/ui@1/dist/ui.browser.js`;
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Could not load Clerk UI components.'));
    document.head.append(script);
  });
  const clerkUi = (window as Window & { __internal_ClerkUICtor?: ClerkUICtor }).__internal_ClerkUICtor;
  if (!clerkUi) throw new Error('Clerk UI components were not initialized.');
  return clerkUi;
}

function renderError(message = 'The server could not load your activities. Try again in a moment.'): void {
  root.render(createElement(ErrorScreen, {
    message,
    onSignOut: clerk?.user ? signOut : undefined,
  }));
}

async function renderDashboardPage(): Promise<void> {
  const currentClerk = clerk;
  if (!currentClerk) {
    window.location.replace('/sign-in?redirect_url=%2Fdashboard');
    return;
  }
  root.render(createElement(LoadingScreen));
  try {
    const token = await currentClerk.session?.getToken();
    if (!token) {
      window.location.replace('/sign-in?redirect_url=%2Fdashboard');
      return;
    }
    const response = await fetch('/api/activities', {
      headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
    });
    if (response.status === 401) {
      await currentClerk.signOut();
      window.location.replace('/sign-in?redirect_url=%2Fdashboard');
      return;
    }
    if (response.status === 404) {
      window.location.replace('/upload');
      return;
    }
    if (!response.ok) throw new Error(`Request failed: ${response.status}`);
    render(await response.json() as DashboardData);
  } catch (error) {
    console.error(error);
    renderError();
  }
}

async function start(): Promise<void> {
  const pathname = window.location.pathname.replace(/\/+$/, '') || '/';
  if (pathname !== '/' && pathname !== '/sign-in' && pathname !== '/dashboard' && pathname !== '/upload') {
    renderError('Page not found.');
    return;
  }

  const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
  if (!publishableKey) {
    if (pathname === '/') {
      renderHome();
      return;
    }
    renderError('Set VITE_CLERK_PUBLISHABLE_KEY to enable sign-in.');
    return;
  }

  try {
    const { Clerk } = await import('@clerk/clerk-js');
    clerk = new Clerk(publishableKey);
    if (pathname === '/sign-in') {
      const clerkUi = await loadClerkUi(publishableKey);
      await clerk.load({ ui: { ClerkUI: clerkUi } });
    } else {
      await clerk.load();
    }
  } catch (error) {
    console.error(error);
    if (pathname === '/') {
      renderHome();
      return;
    }
    renderError('Clerk could not initialize. Check the publishable key and allowed origins.');
    return;
  }

  if (pathname === '/') {
    if (clerk.user) {
      window.location.replace('/dashboard');
      return;
    }
    const callbackUrl = new URL(window.location.href);
    if (callbackUrl.searchParams.has('__clerk_db_jwt')) {
      callbackUrl.searchParams.delete('__clerk_db_jwt');
      window.history.replaceState(null, '', `${callbackUrl.pathname}${callbackUrl.search}${callbackUrl.hash}`);
    }
    renderHome();
    return;
  }

  if (pathname === '/sign-in') {
    if (clerk.user) {
      const requested = new URLSearchParams(window.location.search).get('redirect_url');
      window.location.replace(requested === '/upload' ? '/upload' : '/dashboard');
      return;
    }
    renderSignIn();
    return;
  }

  if (!clerk.user) {
    window.location.replace(`/sign-in?redirect_url=${encodeURIComponent(pathname)}`);
    return;
  }
  if (pathname === '/upload') {
    root.render(createElement(UploadScreen, { clerk, onSignOut: signOut }));
    return;
  }
  await renderDashboardPage();
}

void start();
