'use client';

import { useMemo, useState } from 'react';

export type Event = {
  id: string;
  title: string;
  date: string;
  location: string;
  link: string;
  source?: string;
  isVisible?: boolean;
  isNew?: boolean;
  createdAt?: import("firebase/firestore").Timestamp;
};

export default function EventTimeline({ events = [] }: { events?: Event[] }) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredEvents = useMemo(() => {
    if (!searchQuery.trim()) return events;
    const lowerQuery = searchQuery.toLowerCase();
    return events.filter((e) => e.location.toLowerCase().includes(lowerQuery));
  }, [events, searchQuery]);

  return (
    <div>
      {/* Søkeinput */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Søk etter by, land eller sted..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full md:w-1/2 bg-black border border-[var(--cosevent-yellow)] text-white px-3 py-2 rounded"
        />
      </div>

      {/* Timeline */}
      <div className="relative border-l-2 border-[var(--cosevent-white)] pl-6 space-y-10">
        {filteredEvents.length === 0 ? (
          <p className="text-white/60">Ingen eventer funnet.</p>
        ) : (
          filteredEvents.map((event) => (
            <div key={event.id} className="relative group">
              <span className="absolute -left-3 top-1 w-4 h-4 bg-white rounded-full border-2 border-[var(--cosevent-white)] shadow-md"></span>
              <div className="box has-link group-hover:scale-[1.01] transition-transform">
                <h2 className="text-xl font-bold text-[var(--cosevent-yellow)] mb-1">{event.title}</h2>
                <p className="mb-2 text-sm text-white/80">
                  {event.date} <br />
                  {event.location}
                </p>
                <a
                  href={event.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--cosevent-white)] underline text-sm hover:text-white transition"
                >
                  ➜ Mer info
                </a>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
