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
  P: 'var(--color-ruolo-p)',
  D: 'var(--color-ruolo-d)',
  C: 'var(--color-ruolo-c)',
  A: 'var(--color-ruolo-a)',
};

export const FASCIA_COLORE: Record<Fascia, string> = {
  Top: 'var(--color-fascia-top)',
  'Semi-top': 'var(--color-fascia-semi)',
  'Terza fascia': 'var(--color-fascia-terza)',
  Scommessa: 'var(--color-fascia-scommessa)',
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

/* Le nove avversarie della Zattera, nell'ordine dell'elenco di lega.
   La mia non e' in questa lista: sta in CONFIG_DEFAULT.nomeMiaSquadra,
   perche' generaAvversari crea numPartecipanti - 1 squadre. */
export const NOMI_AVVERSARI_DEFAULT: readonly string[] = [
  'Real Maestro',
  'Cotto e Rosa',
  'CSK La Rissa',
  'Citemmuerte',
  'AC Ciughina',
  'Sestola Bonkers',
  'Venezezia',
  'Atletico Bagnetti',
  'Muppet',
];

export const CONFIG_DEFAULT: ConfigLega = {
  nomeLega: 'Lega La Zattera',
  nomeMiaSquadra: 'Atletico Blascao',
  budgetTotale: 300,
  numPartecipanti: 10,
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
  pitch: 'var(--color-pitch)',
  pitchMid: 'var(--color-pitch-mid)',
  pitchDeep: 'var(--color-pitch-deep)',
  line: 'var(--color-line)',
  lineSoft: 'var(--color-line-soft)',
  chalk: 'var(--color-chalk)',
  dim: 'var(--color-dim)',
  gold: 'var(--color-gold)',
  ok: 'var(--color-ok)',
  amber: 'var(--color-amber)',
  danger: 'var(--color-danger)',
  ink: 'var(--color-ink)',
} as const;
