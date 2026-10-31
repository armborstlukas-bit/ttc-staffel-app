import React from 'react';
import SpielAnzahl from './SpielAnzahl.jsx';
import SpielAnzahlIntro from './SpielAnzahlIntro.jsx';

// Nur für die lokale Entwicklung (siehe main.jsx) – wird nie veröffentlicht.
export default function Vorschau({ name }) {
  const mobil = window.innerWidth < 768;
  if (name === 'intro') return <SpielAnzahlIntro onOpen={() => {}} onLater={() => {}} />;
  return <SpielAnzahl isMobile={mobil} onHome={() => {}} />;
}
