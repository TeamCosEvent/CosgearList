import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer';
import { db } from '@/firebase/firebaseConfig';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    await page.goto('https://animecons.com/events/', { waitUntil: 'networkidle2' });
    await page.waitForSelector('tr.odd, tr.even', { timeout: 7000 });

    const events = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('tr.odd, tr.even'));

      return rows.map(row => {
        const cells = row.querySelectorAll('td');

        const name = cells[0]?.innerText.trim() || 'Unknown Event';
        const href = cells[0]?.querySelector('a')?.getAttribute('href') || '';
        const link = href.startsWith('/') ? `https://animecons.com${href}` : href;

        const date = cells[1]?.innerText.trim() || 'Unknown Date';

        const locationLines = cells[2]?.innerText.trim().split('\n') || [];
        const venue = locationLines[0]?.replace(/"/g, '').trim() || 'Unknown Venue';
        const location = locationLines[1]?.replace(/"/g, '').trim() || 'Unknown Location';

        return {
          id: name.replace(/\s+/g, '-').toLowerCase() + '-' + date.replace(/\s+/g, '-').toLowerCase(),
          title: name,
          date,
          venue,
          location,
          link,
        };
      });
    });

    let addedCount = 0;

    for (const event of events) {
      const ref = doc(db, 'conventions', event.id);
      const existing = await getDoc(ref);

      // Wait 1.5s between Firestore writes to respect crawl delay
      await new Promise(resolve => setTimeout(resolve, 1500));

      if (!existing.exists()) {
        await setDoc(ref, {
          ...event,
          isVisible: true,
          isNew: true,
          createdAt: serverTimestamp(),
          source: 'animecons',
        });
        addedCount++;
      } else {
        await setDoc(ref, {
          ...event,
          updatedAt: serverTimestamp(),
        }, { merge: true });
      }
    }

    await browser.close();

    return NextResponse.json({ message: `AnimeCons crawler complete. ${addedCount} new events added.` });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error('AnimeCons Crawler Error:', err.stack || err.message);
    return NextResponse.json(
      { message: 'Error during crawling', error: err.message },
      { status: 500 }
    );
  }
}
