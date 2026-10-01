import { useEffect, useRef } from 'react';
import type { Clerk as ClerkClient } from '@clerk/clerk-js';

type SignInScreenProps = {
  clerk: ClerkClient;
};

type ErrorScreenProps = {
  message: string;
  onSignOut?: () => void | Promise<void>;
};

export function HomeScreen() {
  return (
    <main className="public-home">
      <header className="public-home__header">
        <a className="brand" href="/">
          <span className="brand__mark">A</span>
          <span className="brand__name">ACTIVITY LEDGER</span>
        </a>
        <a className="public-home__sign-in" href="/sign-in">Sign in</a>
      </header>
      <section className="public-home__hero">
        <p className="eyebrow">YOUR PERSONAL ACTIVITY DASHBOARD</p>
        <h1 className="public-home__title">Activity Ledger</h1>
        <p className="public-home__copy">A clear view of your training history and progress.</p>
        <a className="public-home__cta" href="/sign-in">Sign in to continue</a>
      </section>
    </main>
  );
}

export function SignInScreen({ clerk }: SignInScreenProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    clerk.mountSignIn(container, { forceRedirectUrl: '/dashboard' });
    return () => clerk.unmountSignIn(container);
  }, [clerk]);

  return (
    <main className="auth-shell">
      <div className="auth-widget" ref={containerRef} />
    </main>
  );
}

export function ErrorScreen({ message, onSignOut }: ErrorScreenProps) {
  return (
    <main className="error-shell">
      <span className="brand__mark">!</span>
      <h1>Could not load your activities</h1>
      <p>{message}</p>
      {onSignOut && <button className="sign-out" type="button" onClick={onSignOut}>Sign out</button>}
    </main>
  );
}

export function LoadingScreen() {
  return <p className="loading-state" role="status">Loading your activities…</p>;
}