// functions/src/magiconCrawler.ts
import puppeteer from 'puppeteer';
import { admin } from './firebaseAdmin';

const db = admin.firestore();
const { FieldValue } = admin.firestore;

export async function runMagiconCrawler(): Promise<string> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox'],
  });

  const page = await browser.newPage();
  await page.goto('https://www.magicon.no/community/', { waitUntil: 'networkidle2' });
  await page.waitForSelector('li.av-milestone', { timeout: 5000 });

  const events = await page.evaluate(() => {
    const eventList = Array.from(document.querySelectorAll('li.av-milestone'));
    return eventList.map((event) => {
      const h2 = event.querySelector('h2.av-milestone-date');
      const h4 = event.querySelector('h4.av-milestone-title');
      const titleTag = h2 || h4;

      const linkTag = titleTag?.querySelector('a');
      const title = titleTag?.textContent?.trim() || 'Unknown Event';
      const link = linkTag?.getAttribute('href') || 'No Link';
      const date = linkTag?.getAttribute('title') || 'Unknown Date';

      const contentDiv = event.querySelector('div.av-milestone-content');
      const location = contentDiv?.querySelector('p')?.textContent?.trim() || 'Unknown Location';

      return {
        id: title.replace(/\s+/g, '-').toLowerCase(),
        title,
        date,
        location,
        link,
      };
    });
  });

  let addedCount = 0;

  for (const event of events) {
    const ref = db.doc(`conventions/${event.id}`);
    const existing = await ref.get();

    if (!existing.exists) {
      await ref.set({
        ...event,
        isVisible: true,
        isNew: true,
        createdAt: FieldValue.serverTimestamp(),
        source: 'magicon',
      });
      addedCount++;
    } else {
      await ref.set({
        ...event,
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
    }
  }

  await browser.close();
  return `Crawler ferdig. ${addedCount} nye events lagt til.`;
}
