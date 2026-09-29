// Kleiner Zustandsspeicher für das neue App-Design (Beta), damit die untere Leiste (BetaNav)
// außerhalb der großen App-Komponente leben kann und trotzdem Ansicht, Badges und Aktionen kennt.
let state = { enabled: false };
const listeners = new Set();

export const betaStore = {
  get: () => state,
  set: (next) => { state = next; listeners.forEach((l) => l()); },
  subscribe: (l) => { listeners.add(l); return () => listeners.delete(l); },
};

export const BETA_LS_KEY = 'ttcBetaDesign';
// Nur dieser Account sieht den Schalter für das neue Design
export const BETA_EMAILS = ['armborst.lukas@gmail.com'];
