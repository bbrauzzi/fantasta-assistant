import type { Fascia, Ruolo, ConfigLega } from '../types';

export const RUOLI: readonly Ruolo[] = ['P', 'D', 'C', 'A'] as const;
export const FASCE: readonly Fascia[] = ['Top', 'Semi-top', 'Terza fascia', 'Scommessa'] as const;

export const RUOLO_LABEL: Record<Ruolo, string> = {
  P: 'Portieri',
  D: 'Difensori',
  C: 'Centrocampisti',
  A: 'Attaccanti',
};

export const RUOLO_SINGOLARE: Record<Ruolo, string> = {
  P: 'portiere',
  D: 'difensore',
  C: 'centrocampista',
  A: 'attaccante',
};

export const RUOLO_COLORE: Record<Ruolo, string> = {
  P: '#E0A94A',
  D: '#5B8CC7',
  C: '#6FBF7A',
  A: '#D46A6A',
};

export const FASCIA_COLORE: Record<Fascia, string> = {
  Top: '#D4AF37',
  'Semi-top': '#AEB4BC',
  'Terza fascia': '#8FB4A6',
  Scommessa: '#B5651D',
};

/** Ordinamento delle fasce: 0 = migliore. */
export const RANGO_FASCIA: Record<Fascia, number> = {
  Top: 0,
  'Semi-top': 1,
  'Terza fascia': 2,
  Scommessa: 3,
};

/** Sotto questa soglia di titolarita' una casella e' "debole" e va marcata. */
export const SOGLIA_TITOLARITA_DEBOLE = 55;

export const CONFIG_DEFAULT: ConfigLega = {
  budgetTotale: 500,
  numPartecipanti: 8,
  slotPerRuolo: { P: 3, D: 8, C: 8, A: 6 },
  percBudgetPerRuolo: { P: 5, D: 15, C: 30, A: 50 },
  prezzoMinimoSlot: 1,
  sogliaConcentrazioneSquadra: 4,
  // pagina di riferimento per le probabili formazioni: cambia ogni stagione,
  // quindi resta un campo di configurazione modificabile dal Setup
  linkFormazioniProbabili:
    'https://www.fantacalcio.it/news/calcio-italia/06_08_2026/asta-fantacalcio-le-probabili-formazioni-della-serie-a-enilive-2026-27-495558',
};

export const PALETTE = {
  pitch: '#0B3D2E',
  pitchMid: '#134C36',
  pitchDeep: '#08281E',
  line: '#1D5843',
  lineSoft: 'rgba(244,240,230,.09)',
  chalk: '#F4F0E6',
  dim: '#9FB3A9',
  gold: '#D4AF37',
  ok: '#4E9C6E',
  amber: '#D8963C',
  danger: '#C24B3F',
  ink: '#0A1F17',
} as const;
