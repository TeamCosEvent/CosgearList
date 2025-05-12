'use client';

import { useMemo, useState, useRef, useEffect } from 'react';
import { DateRange, Range } from 'react-date-range';
import { parse, isWithinInterval, endOfYear } from 'date-fns';
import { format } from 'date-fns';
import { nb, enUS } from 'date-fns/locale';
import { Event } from './types';

type Props = { events?: Event[] };

function normalizeDateString(dateStr: string): string {
  return dateStr
    .replace(/[–—−-]/g, '-')
    .replace(/(\d+)\.(\d+)\.(\d{4})/, '$1-$2-$3')
    .replace(/\./g, '')
    .replace(/ +/g, ' ')
    .trim();
}

function parseEventDateRange(dateStr: string): { start: Date; end: Date } | null {
  const cleaned = normalizeDateString(dateStr);

  const formats = [
    { pattern: /^(\d+)-(\d+)\s(\w+)\s(\d{4})$/, format: 'd MMMM yyyy', locales: [nb, enUS] },
    { pattern: /^(\w+)\s(\d+)-(\d+),\s(\d{4})$/, format: 'MMMM d yyyy', locales: [enUS, nb] },
    { pattern: /^(\d+)-(\d+)-(\d+)-(\d{4})$/, format: 'd-M-d-M-yyyy', locales: [nb, enUS] },
    { pattern: /^(\d{1,2})-(\d{1,2})-(\d{4})$/, format: 'd-M-yyyy', locales: [nb, enUS] },
  ];

  for (const { pattern, format: fmt, locales } of formats) {
    const match = cleaned.match(pattern);
    if (match) {
      const groups = match.slice(1);
      for (const locale of locales) {
        try {
          if (groups.length === 4) {
            const [a, b, c, d] = groups;
            if (isNaN(Number(c))) {
              const [startDay, endDay, month, year] = groups;
              const start = parse(`${startDay} ${month} ${year}`, fmt, new Date(), { locale });
              const end = parse(`${endDay} ${month} ${year}`, fmt, new Date(), { locale });
              if (!isNaN(start.getTime()) && !isNaN(end.getTime())) return { start, end };
            }
          } else if (groups.length === 3) {
            const date = parse(groups.join(' '), fmt, new Date(), { locale });
            if (!isNaN(date.getTime())) return { start: date, end: date };
          }
        } catch {}
      }
    }
  }

  const singleFormats = ['d MMMM yyyy', 'MMMM d, yyyy', 'd.MM.yyyy'];
  for (const fmt of singleFormats) {
    for (const locale of [nb, enUS]) {
      try {
        const single = parse(cleaned, fmt, new Date(), { locale });
        if (!isNaN(single.getTime())) return { start: single, end: single };
      } catch {}
    }
  }

  console.warn('Failed to parse date:', dateStr);
  return null;
}

export default function EventTimeline({ events = [] }: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState<Range[]>([{
    startDate: undefined, endDate: undefined, key: 'selection'
  }]);
  const [pendingRange, setPendingRange] = useState<Range[]>([{
    startDate: undefined, endDate: undefined, key: 'selection'
  }]);
  const [showPicker, setShowPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setShowPicker(false);
      }
    };
    if (showPicker) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showPicker]);

  const startDate = dateRange[0].startDate;
  const endDate = dateRange[0].endDate;

  const filteredEvents = useMemo(() => {
    const today = new Date();
    return events
      .map(event => {
        const parsed = parseEventDateRange(event.date);
        return parsed ? { ...event, parsedStart: parsed.start, parsedEnd: parsed.end } : null;
      })
      .filter((event): event is Event & { parsedStart: Date; parsedEnd: Date } => !!event)
      .filter(event => {
        if (event.parsedEnd < today) return false;
        const locationMatch = event.location.toLowerCase().includes(searchQuery.toLowerCase());
        if (!startDate || !endDate) return true;
        return (
          locationMatch &&
          (isWithinInterval(event.parsedStart, { start: startDate, end: endDate }) ||
           isWithinInterval(event.parsedEnd, { start: startDate, end: endDate }))
        );
      })
      .sort((a, b) => a.parsedStart.getTime() - b.parsedStart.getTime());
  }, [events, searchQuery, startDate, endDate]);

  return (
    <div className="px-4 md:px-0 max-w-6xl mx-auto">
      <div className="mb-8 flex flex-col sm:flex-row gap-4 sm:items-start py-4">
        <input
          type="text"
          placeholder="Search by city or country..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full sm:w-1/2 border border-[var(--cosevent-yellow)] text-white bg-black px-3 py-2 rounded"
        />

        <div className="flex flex-col gap-2 sm:w-auto w-full relative">
          <button
            onClick={() => setShowPicker(!showPicker)}
            className="w-full sm:w-auto border border-[var(--cosevent-yellow)] text-white bg-black px-4 py-2 rounded"
          >
            {startDate && endDate
              ? `Fra ${format(startDate, 'dd.MM.yyyy')} til ${format(endDate, 'dd.MM.yyyy')}`
              : 'Date'}
          </button>

          {showPicker && (
            <div
              ref={pickerRef}
              className="absolute top-full mt-2 bg-white shadow-md z-50 w-[340px] max-w-full right-0"
            >
              <DateRange
                editableDateInputs
                onChange={(item) => {
                setPendingRange([item.selection]);

                const { startDate, endDate } = item.selection;

                if (
                  startDate &&
                  endDate &&
                  startDate.getTime() !== endDate.getTime()
                ) {
                  setDateRange([item.selection]);
                  setShowPicker(false);
                }
              }}

                moveRangeOnFirstSelection={false}
                ranges={pendingRange}
                locale={nb}
                minDate={new Date()}
                months={1}
                direction="vertical"
                showDateDisplay={false}
              />
            </div>
          )}
        </div>

        <button
          onClick={() => {
            setSearchQuery('');
            const empty = [{ startDate: undefined, endDate: undefined, key: 'selection' }];
            setDateRange(empty);
            setPendingRange(empty);
          }}
          className="w-full sm:w-auto border border-[var(--cosevent-yellow)] text-white bg-black px-4 py-2 rounded"
        >
          Remove filter
        </button>
      </div>

      {startDate && endDate && (
        <p className="text-sm text-white/70 mb-6">
          Showing events from {format(startDate, 'dd.MM.yyyy')} to {format(endDate, 'dd.MM.yyyy')}
        </p>
      )}

      <div className="relative border-l-2 border-[var(--cosevent-white)] pl-6 space-y-10">
        {filteredEvents.length === 0 ? (
          <p className="text-white/60">
            Ingen eventer funnet.
            <br />
            <span className="text-sm text-white/40">Tip: Remove filters or widen search.</span>
          </p>
        ) : (
          filteredEvents.map((event) => (
            <div key={event.id} className="relative group">
              <span className="absolute -left-3 top-1 w-4 h-4 bg-white rounded-full border-2 border-[var(--cosevent-white)] shadow-md"></span>
              <div className="box has-link group-hover:scale-[1.01] transition-transform">
                <h2 className="text-xl font-bold text-[var(--cosevent-yellow)] mb-1">
                  {event.title}
                </h2>
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
                  ➔ More info
                </a>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
