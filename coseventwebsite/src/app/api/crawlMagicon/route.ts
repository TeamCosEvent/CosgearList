// Importerer nødvendige moduler og funksjoner
import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer';
import { db } from '../../../firebase/firebaseConfig';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';

// Sørger for at route kjøres som en dynamisk funksjon hver gang (ikke cachet)
export const dynamic = 'force-dynamic';

// GET-handler som kjører webcrawler
export async function GET() {
  try {
    // Starter en headless (usynlig) nettleser med sikre innstillinger for servermiljø
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    // Åpner en ny fane og navigerer til Magicon sin community-side
    const page = await browser.newPage();
    await page.goto('https://www.magicon.no/community/', { waitUntil: 'networkidle2' });

    // Venter til event-elementene er lastet inn på siden
    await page.waitForSelector('li.av-milestone', { timeout: 5000 });

    // Henter ut informasjon om events direkte fra DOM
    const events = await page.evaluate(() => {
      const eventList = Array.from(document.querySelectorAll("li.av-milestone"));

      return eventList.map((event) => {
        const h2 = event.querySelector("h2.av-milestone-date");
        const h4 = event.querySelector("h4.av-milestone-title");
        const titleTag = h2 || h4; // Noen events har dato som overskrift, andre har tittel

        const linkTag = titleTag?.querySelector("a");
        const title = titleTag?.textContent?.trim() || "Unknown Event";
        const link = linkTag?.getAttribute("href") || "No Link";
        const date = linkTag?.getAttribute("title") || "Unknown Date";

        const contentDiv = event.querySelector("div.av-milestone-content");
        const location = contentDiv?.querySelector("p")?.textContent?.trim() || "Unknown Location";

        // Returnerer strukturert event-data
        return {
          id: title.replace(/\s+/g, "-").toLowerCase(), // Lager en ID basert på tittelen
          title,
          date,
          location,
          link,
        };
      });
    });

    let addedCount = 0; // Teller antall nye events lagt til databasen

    // Lagrer events i Firestore
    for (const event of events) {
      const ref = doc(db, 'conventions', event.id);
      const existing = await getDoc(ref);

      if (!existing.exists()) {
        // Ny event – lagrer som nytt dokument med metadata
        await setDoc(ref, {
          ...event,
          isVisible: true,      // Synlig for frontend
          isNew: true,          // Ny event (for notifikasjoner)
          createdAt: serverTimestamp(), // Tidsstempel
          source: 'magicon',    // Kilde
        });
        addedCount++;
      } else {
        // Event finnes allerede – oppdaterer med ny data og timestamp
        await setDoc(ref, {
          ...event,
          updatedAt: serverTimestamp(),
        }, { merge: true }); // Slår sammen med eksisterende data
      }
    }

    await browser.close(); // Lukker nettleseren

    // Returnerer en JSON-respons med status
    return NextResponse.json({ message: `Crawler ferdig. ${addedCount} nye events lagt til.` });

  } catch (error) {
    // Feilhåndtering
    const err = error instanceof Error ? error : new Error(String(error));
    console.error('Crawler-feil:', err.stack || err.message);

    // Returnerer en feilmelding som JSON-respons med HTTP 500-status
    return NextResponse.json(
      { message: 'Feil under crawling', error: err.message },
      { status: 500 }
    );
  }
}
