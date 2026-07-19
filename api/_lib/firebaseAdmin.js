import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';

// Erwartet die Umgebungsvariable FIREBASE_SERVICE_ACCOUNT (kompletter Inhalt
// der in der Firebase-Console heruntergeladenen Service-Account-JSON-Datei, als String).
function getAdminApp() {
  if (getApps().length) return getApps()[0];
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT ist nicht gesetzt');
  const serviceAccount = JSON.parse(raw);
  return initializeApp({ credential: cert(serviceAccount) });
}

export function adminAuth() { return getAuth(getAdminApp()); }
export function adminDb() { return getFirestore(getAdminApp()); }
export function adminMessaging() { return getMessaging(getAdminApp()); }

// Verifiziert den vom Client mitgeschickten Firebase-ID-Token und liefert die uid zurück.
export async function verifyRequestUser(req) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return null;
  try {
    const decoded = await adminAuth().verifyIdToken(token);
    return decoded.uid;
  } catch {
    return null;
  }
}
