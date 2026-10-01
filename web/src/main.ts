import './style.css';
import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import type { Clerk as ClerkClient } from '@clerk/clerk-js';
import { Dashboard } from './components/dashboard';
import type { Dashboard as DashboardData } from './types';

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('App root is missing');
const appRoot: HTMLDivElement = app;
let clerk: ClerkClient | null = null;
type ClerkUICtor = NonNullable<NonNullable<Parameters<ClerkClient['load']>[0]>['ui']>['ClerkUI'];

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function renderHome(): void {
  appRoot.replaceChildren();
  const main = el('main', 'public-home');
  const header = el('header', 'public-home__header');
  const brand = el('a', 'brand');
  brand.href = '/';
  brand.append(el('span', 'brand__mark', 'A'), el('span', 'brand__name', 'ACTIVITY LEDGER'));
  const signInLink = el('a', 'public-home__sign-in', 'Sign in');
  signInLink.href = '/sign-in';
  header.append(brand, signInLink);

  const intro = el('section', 'public-home__hero');
  intro.append(
    el('p', 'eyebrow', 'YOUR PERSONAL ACTIVITY DASHBOARD'),
    el('h1', 'public-home__title', 'Activity Ledger'),
    el('p', 'public-home__copy', 'A clear view of your training history and progress.'),
  );
  const dashboardLink = el('a', 'public-home__cta', 'Sign in to continue');
  dashboardLink.href = '/sign-in';
  intro.append(dashboardLink);
  main.append(header, intro);
  appRoot.append(main);
}

function render(data: DashboardData): void {
  createRoot(appRoot).render(createElement(Dashboard, {
    data,
    onSignOut: async () => {
      await clerk?.signOut();
      window.location.assign('/');
    },
  }));
}

function renderSignIn(): void {
  if (!clerk) return;
  appRoot.replaceChildren();
  const main = el('main', 'auth-shell');
  const signIn = el('div', 'auth-widget');
  main.append(signIn);
  appRoot.append(main);
  clerk.mountSignIn(signIn, { forceRedirectUrl: '/dashboard' });
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
  appRoot.replaceChildren();
  const main = el('main', 'error-shell');
  const mark = el('span', 'brand__mark', '!');
  const heading = el('h1', '', 'Could not load your activities');
  const copy = el('p', '', message);
  main.append(mark, heading, copy);
  if (clerk?.user) {
    const signOut = el('button', 'sign-out', 'Sign out');
    signOut.type = 'button';
    signOut.addEventListener('click', async () => {
      await clerk?.signOut();
      window.location.assign('/');
    });
    main.append(signOut);
  }
  appRoot.append(main);
}

async function renderDashboardPage(): Promise<void> {
  const currentClerk = clerk;
  if (!currentClerk) {
    window.location.replace('/sign-in?redirect_url=%2Fdashboard');
    return;
  }
  const loading = el('p', 'loading-state', 'Loading your activities…');
  loading.setAttribute('role', 'status');
  appRoot.replaceChildren(loading);
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
    if (!response.ok) throw new Error(`Request failed: ${response.status}`);
    render(await response.json() as DashboardData);
  } catch (error) {
    console.error(error);
    renderError();
  }
}

async function start(): Promise<void> {
  const pathname = window.location.pathname.replace(/\/+$/, '') || '/';
  if (pathname !== '/' && pathname !== '/sign-in' && pathname !== '/dashboard') {
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
      window.location.replace('/dashboard');
      return;
    }
    renderSignIn();
    return;
  }

  if (!clerk.user) {
    window.location.replace('/sign-in?redirect_url=%2Fdashboard');
    return;
  }
  await renderDashboardPage();
}

void start();
