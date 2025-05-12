// Oppdatert EventTimeline uten søk-knapp – filtrering skjer automatisk når slutt-dato velges
'use client';

import { useMemo, useState, useRef, useEffect } from 'react';
import { DateRange, Range } from 'react-date-range';
import { parse, isWithinInterval, endOfYear } from 'date-fns';
import { format } from 'date-fns';
import { nb, enUS } from 'date-fns/locale';
import { Event } from './types';

type Props = { events?: Event[] };

function parseEventDateRange(dateStr: string): { start: Date; end: Date } | null {
  const tryFormats = [
    { format: 'd MMMM yyyy', locales: [nb, enUS] },
    { format: 'MMMM d, yyyy', locales: [enUS, nb] },
    { format: 'd.MM.yyyy', locales: [nb, enUS] },
  ];

  const rangePatterns = [
    /^\w+\s(\d+)-(\d+),\s(\d{4})$/, // June 13-15, 2025
    /^(\d+)-(\d+)\s\w+\s(\d{4})$/, // 13-15 June 2025
    /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/, // 13.06.2025
  ];

  try {
    for (const pattern of rangePatterns) {
      const match = dateStr.match(pattern);
      if (match) {
        if (pattern === rangePatterns[0]) {
          const [_, startDay, endDay, year] = match;
          for (const locale of [nb, enUS]) {
            const month = dateStr.match(/^([a-zA-Z]+)/)?.[1] ?? '';
            const start = parse(`${startDay} ${month} ${year}`, 'd MMMM yyyy', new Date(), { locale });
            const end = parse(`${endDay} ${month} ${year}`, 'd MMMM yyyy', new Date(), { locale });
            if (!isNaN(start.getTime()) && !isNaN(end.getTime())) return { start, end };
          }
        } else if (pattern === rangePatterns[1]) {
          const [_, startDay, endDay, month, year] = match;
          for (const locale of [nb, enUS]) {
            const start = parse(`${startDay} ${month} ${year}`, 'd MMMM yyyy', new Date(), { locale });
            const end = parse(`${endDay} ${month} ${year}`, 'd MMMM yyyy', new Date(), { locale });
            if (!isNaN(start.getTime()) && !isNaN(end.getTime())) return { start, end };
          }
        } else if (pattern === rangePatterns[2]) {
          const [_, day, month, year] = match;
          const date = parse(`${day}.${month}.${year}`, 'd.MM.yyyy', new Date(), { locale: nb });
          return { start: date, end: date };
        }
      }
    }

    for (const { format: f, locales } of tryFormats) {
      for (const locale of locales) {
        const parsed = parse(dateStr, f, new Date(), { locale });
        if (!isNaN(parsed.getTime())) return { start: parsed, end: parsed };
      }
    }

    return null;
  } catch {
    return null;
  }
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
        if (!startDate || !endDate) return locationMatch;
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
          placeholder="Søk etter by, land eller sted..."
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
              : 'Velg dato'}
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
                  if (item.selection.startDate && item.selection.endDate) {
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
          Nullstill filter
        </button>
      </div>

      {startDate && endDate && (
        <p className="text-sm text-white/70 mb-6">
          Viser events fra {format(startDate, 'dd.MM.yyyy')} til {format(endDate, 'dd.MM.yyyy')}
        </p>
      )}

      <div className="relative border-l-2 border-[var(--cosevent-white)] pl-6 space-y-10">
        {filteredEvents.length === 0 ? (
          <p className="text-white/60">
            Ingen eventer funnet.
            <br />
            <span className="text-sm text-white/40">Tips: Nullstill filteret eller søk bredere.</span>
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