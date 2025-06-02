// functions/src/index.ts
import { onCall } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { HttpsError } from 'firebase-functions/v2/https';
import { runMagiconCrawler } from './magiconCrawler';
import './firebaseAdmin';

// 🌍 Region satt til europe-west1 for å unngå us-central1-problemer

// 🚀 Manuell trigger fra nettside (httpsCallable)
export const runCrawlers = onCall({ region: 'europe-west1' }, async () => {
  try {
    const result = await runMagiconCrawler();
    return { message: 'Kjørte crawler', result };
  } catch (err: any) {
    console.error('Feil i runCrawlers:', err);
    throw new HttpsError('internal', 'Crawler feilet', err.message);
  }
});

// ⏰ Automatisk cronjob (hver 12. time)
export const scheduledCrawler = onSchedule(
  {
    region: 'europe-west1',
    schedule: 'every 12 hours',
    timeZone: 'Europe/Oslo',
  },
  async () => {
    try {
      const result = await runMagiconCrawler();
      console.log('Cronjob resultat:', result);
    } catch (err) {
      console.error('Cronjob feilet:', err);
    }
  }
);
