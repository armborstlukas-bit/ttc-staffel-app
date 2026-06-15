import { initializeApp } from '../node_modules/firebase/app/dist/index.esm.js';
import { getFirestore, doc, getDoc, setDoc } from '../node_modules/firebase/firestore/dist/index.esm.js';
import { readFileSync } from 'fs';

const firebaseConfig = {
  apiKey: "AIzaSyCrx34HEgaHnRE187Cja4JNAtbexvrA6Vg",
  authDomain: "ttc-staffel-app.firebaseapp.com",
  projectId: "ttc-staffel-app",
  storageBucket: "ttc-staffel-app.firebasestorage.app",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abc"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const excelData = JSON.parse(readFileSync('scripts/ttr_excel_data.json', 'utf8'));

// Read children from Firestore
const kinderSnap = await getDoc(doc(db, 'ttc', 'kinder'));
if (!kinderSnap.exists()) { console.error('kinder doc not found'); process.exit(1); }
const kinder = kinderSnap.data().kinder || [];
console.log('Children in app:', kinder.length);

// Match by name
const ttrHistory = {};
let matched = 0, unmatched = [];
for (const child of kinder) {
  if (excelData[child.name]) {
    ttrHistory[child.id] = { entries: excelData[child.name] };
    matched++;
  } else {
    unmatched.push(child.name);
  }
}
console.log('Matched:', matched, '/', kinder.length);
if (unmatched.length) console.log('Unmatched:', unmatched.join(', '));

// Write to Firestore
await setDoc(doc(db, 'ttc', 'ttrHistory'), ttrHistory);
console.log('✓ ttrHistory saved to Firestore');
process.exit(0);
