'use client';
import { useState } from 'react';
import AdminNavbar from '@/components/AdminNavbar';

export default function ManualCrawler() {
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  const triggerCrawler = async () => {
    setLoading(true);
    setStatus('Kjører crawler...');
    try {
      const res = await fetch('/api/crawlAnimeCons');
      const json = await res.json();
      setStatus(json.message || 'Crawler ferdig!');
    } catch {
      setStatus('Feil ved kjøring av crawler.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <AdminNavbar />
      <main className="flex flex-col items-center justify-center min-h-screen bg-[var(--cosevent-bg)] text-white px-4 py-16 font-sans pt-32">
        <div className="w-full max-w-3xl">
          <h2 className="text-4xl font-bold text-[var(--cosevent-yellow)] mb-6">
            Manuell Conventions-Crawler
          </h2>

          <p className="mb-8 text-white/80">
            Trykk på knappen under for å manuelt trigge crawlerne som henter inn nye conventions fra eksterne nettsider (Magicon og AnimeCons).
          </p>

          <button
            onClick={triggerCrawler}
            className="btn-primary disabled:opacity-50"
            disabled={loading}
          >
            {loading ? 'Kjører...' : 'Kjør crawler nå'}
          </button>

          {status && (
            <pre className="p-4 mt-6 font-mono text-white whitespace-pre-wrap rounded bg-black/20">
              {status}
            </pre>
          )}
        </div>
      </main>
    </>
  );
}
