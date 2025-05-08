'use client';

import { useMemo, useState } from 'react';

export type Event = {
  id: string;
  title: string;
  date: string; // Forutsetter at dette er i et ISO-format eller noe Date-parsable
  location: string;
  link: string;
  source?: string;
  isVisible?: boolean;
  isNew?: boolean;
  createdAt?: import("firebase/firestore").Timestamp;
};

export default function EventTimeline({ events = [] }: { events?: Event[] }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      const matchesLocation = e.location.toLowerCase().includes(searchQuery.toLowerCase());
      const eventDate = new Date(e.date);
      const isAfterFromDate = fromDate ? eventDate >= new Date(fromDate) : true;
      const isBeforeToDate = toDate ? eventDate <= new Date(toDate) : true;
      return matchesLocation && isAfterFromDate && isBeforeToDate;
    });
  }, [events, searchQuery, fromDate, toDate]);

  return (
    <div>
      {/* Filtreringsinput */}
      <div className="mb-6 flex flex-col md:flex-row gap-4">
        <input
          type="text"
          placeholder="Søk etter by, land eller sted..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full md:w-1/3 bg-black border border-[var(--cosevent-yellow)] text-white px-3 py-2 rounded"
        />
        <input
          type="date"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
          className="w-full md:w-1/3 bg-black border border-[var(--cosevent-yellow)] text-white px-3 py-2 rounded"
        />
        <input
          type="date"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
          className="w-full md:w-1/3 bg-black border border-[var(--cosevent-yellow)] text-white px-3 py-2 rounded"
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
