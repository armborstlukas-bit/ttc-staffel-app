// Firestore-Zugang für den Monatsimport (Service-Account liegt in der .env.local der Webseite).
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'node:fs';
const env = fs.readFileSync(new URL('../../../ttc-staffel-web/.env.local', import.meta.url), 'utf8');
const raw = env.match(/^FIREBASE_SERVICE_ACCOUNT=(.*)$/m)[1].replace(/^'|'$/g, '');
initializeApp({ credential: cert(JSON.parse(raw)) });
export const db = getFirestore();
