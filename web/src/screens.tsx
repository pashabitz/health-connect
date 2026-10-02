import { useEffect, useRef, useState } from 'react';
import type { Clerk as ClerkClient } from '@clerk/clerk-js';
import { put } from '@vercel/blob/client';
import { FileArchive, Upload } from 'lucide-react';
import { extractActivitiesCsv } from './strava-export.mjs';

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
    const requested = new URLSearchParams(window.location.search).get('redirect_url');
    clerk.mountSignIn(container, { forceRedirectUrl: requested === '/upload' ? '/upload' : '/dashboard' });
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

export function UploadScreen({ clerk, onSignOut }: { clerk: ClerkClient; onSignOut: () => Promise<void> }) {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [complete, setComplete] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file || busy) return;
    setBusy(true);
    setError('');
    setComplete(false);
    try {
      setStatus('Preparing export...');
      const csv = await extractActivitiesCsv(file);
      async function request(body: object) {
        const token = await clerk.session?.getToken();
        if (!token) { window.location.assign('/sign-in?redirect_url=%2Fupload'); throw new Error('Please sign in again.'); }
        const response = await fetch('/api/uploads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(body),
        });
        if (response.status === 401) window.location.assign('/sign-in?redirect_url=%2Fupload');
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Upload failed.');
        return result;
      }
      const prepared = await request({ action: 'prepare' });
      await put(prepared.pathname, csv, {
        access: 'private', token: prepared.token, contentType: 'text/csv',
        multipart: csv.size > 5 * 1024 * 1024,
        onUploadProgress: ({ percentage }) => setStatus(`Uploading ${Math.round(percentage)}%`),
      });
      setStatus('Validating activities...');
      const result = await request({ action: 'finalize', uploadId: prepared.uploadId });
      setStatus(`${result.activityCount.toLocaleString()} activities imported.`);
      setComplete(true);
    } catch (failure) {
      setStatus('');
      setError(failure instanceof Error ? failure.message : 'Could not upload export.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="shell">
      <header className="masthead">
        <a className="brand" href="/dashboard"><span className="brand__mark">A</span><span className="brand__name">ACTIVITY LEDGER</span></a>
        <nav className="account-nav" aria-label="Account">
          <a href="/dashboard">Dashboard</a>
          <button className="sign-out" type="button" onClick={onSignOut}>Sign out</button>
        </nav>
      </header>
      <section className="upload-section">
        <h1>Import Strava export</h1>
        <form onSubmit={submit} aria-busy={busy}>
          <label className="upload-file" htmlFor="export-file">
            <FileArchive size={32} aria-hidden="true" />
            <span>Strava export</span>
            <input id="export-file" type="file" accept=".csv,.zip" required disabled={busy} onChange={(event) => {
              setFile(event.target.files?.[0] ?? null); setError(''); setStatus(''); setComplete(false);
            }} />
          </label>
          <button className="upload-submit" type="submit" disabled={!file || busy || complete}>
            <Upload size={16} aria-hidden="true" />{busy ? 'Importing...' : 'Import'}
          </button>
          {busy && <progress className="upload-progress" aria-label="Import in progress" />}
          <p className="upload-status" role="status">{status}</p>
          {error && <p className="filter-error" role="alert">{error}</p>}
          {complete && <a className="upload-dashboard" href="/dashboard">View dashboard</a>}
        </form>
      </section>
    </main>
  );
}