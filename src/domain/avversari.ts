/* ============================================================
   F7 - tracker avversari.
   Tutto qui dentro e' una STIMA basata su cio' che ho inserito io:
   se non ho tracciato tutto, i residui risultano per eccesso.
   ============================================================ */

import type { Avversario, Calciatore, ConfigLega, Ruolo } from '../types';
import { NOMI_AVVERSARI_DEFAULT, RUOLI, RUOLO_LABEL } from './costanti';
import { calcolaMaxOfferta } from './budget';

export interface AvversarioCalcolato {
  id: string;
  nome: string;
  /** crediti spesi: acquisti tracciati per giocatore + conteggio rapido */
  speso: number;
  spesoTracciato: number;
  speseManuali: number;
  residui: number;
  slotOccupati: number;
  slotTracciati: number;
  slotManuali: number;
  slotTotali: number;
  slotDaRiempire: number;
  maxOfferta: number;
  presiPerRuolo: Record<Ruolo, number>;
  /** ruoli che non puo' piu' comprare: e' fuori dalla contesa su quelli */
  ruoliSaturi: Ruolo[];
  /** ho contato acquisti senza dettagliarli: i numeri sono approssimati */
  datiParziali: boolean;
  calciatori: Calciatore[];
}

export function calcolaAvversari(
  avversari: Avversario[],
  calciatori: Calciatore[],
  cfg: ConfigLega,
): AvversarioCalcolato[] {
  const slotTotali = RUOLI.reduce((s, r) => s + cfg.slotPerRuolo[r], 0);

  return avversari.map((a) => {
    const suoi = calciatori.filter((c) => c.stato === 'perso' && c.acquirenteId === a.id);
    const spesoTracciato = suoi.reduce((s, c) => s + (c.prezzoDiMercato ?? 0), 0);
    const speso = spesoTracciato + a.speseManuali;

    const presiPerRuolo: Record<Ruolo, number> = { P: 0, D: 0, C: 0, A: 0 };
    for (const c of suoi) presiPerRuolo[c.ruolo] += 1;

    const slotTracciati = suoi.length;
    const slotOccupati = slotTracciati + a.slotManuali;
    const slotDaRiempire = Math.max(0, slotTotali - slotOccupati);
    const residui = a.budgetIniziale - speso;

    const ruoliSaturi = RUOLI.filter((r) => presiPerRuolo[r] >= cfg.slotPerRuolo[r]);

    return {
      id: a.id,
      nome: a.nome,
      speso,
      spesoTracciato,
      speseManuali: a.speseManuali,
      residui,
      slotOccupati,
      slotTracciati,
      slotManuali: a.slotManuali,
      slotTotali,
      slotDaRiempire,
      maxOfferta: calcolaMaxOfferta(residui, slotDaRiempire, cfg.prezzoMinimoSlot),
      presiPerRuolo,
      ruoliSaturi,
      // se ho usato il conteggio rapido non so a chi sono andati quei crediti:
      // slot per ruolo e residui sono approssimati
      datiParziali: a.slotManuali > 0,
      calciatori: suoi,
    };
  });
}

export interface ChiPuoRilanciare {
  prezzo: number;
  possono: AvversarioCalcolato[];
  fuori: AvversarioCalcolato[];
  totale: number;
  /** true se almeno uno di quelli "dentro" ha dati parziali */
  stimaIncerta: boolean;
}

/**
 * Dato un prezzo che sto considerando, chi ha ancora la capienza per superarlo.
 * E' l'informazione che decide se rilancio o mi fermo.
 * Se passo un ruolo, chi ha gia' saturato quel ruolo esce dalla contesa.
 */
export function chiPuoRilanciare(
  avversari: AvversarioCalcolato[],
  prezzo: number,
  ruolo?: Ruolo,
): ChiPuoRilanciare {
  const possono: AvversarioCalcolato[] = [];
  const fuori: AvversarioCalcolato[] = [];

  for (const a of avversari) {
    const saturo = ruolo ? a.ruoliSaturi.includes(ruolo) : false;
    if (!saturo && a.maxOfferta > prezzo) possono.push(a);
    else fuori.push(a);
  }

  return {
    prezzo,
    possono: possono.sort((x, y) => y.maxOfferta - x.maxOfferta),
    fuori: fuori.sort((x, y) => y.maxOfferta - x.maxOfferta),
    totale: avversari.length,
    stimaIncerta: possono.some((a) => a.datiParziali),
  };
}

/** Conteggio "quanti possono rilanciare" a soglie fisse, per il pannello laterale. */
export function conteggioPerSoglie(
  avversari: AvversarioCalcolato[],
  soglie: number[],
): Array<{ soglia: number; quanti: number }> {
  return soglie.map((s) => ({ soglia: s, quanti: chiPuoRilanciare(avversari, s).possono.length }));
}

export function etichettaRuoliSaturi(ruoli: Ruolo[]): string {
  if (ruoli.length === 0) return '';
  return ruoli.map((r) => `${RUOLO_LABEL[r].toLowerCase()} saturi`).join(', ');
}

/** Avversari generati automaticamente da numPartecipanti (io sono il primo). */
export function generaAvversari(cfg: ConfigLega, esistenti: Avversario[] = []): Avversario[] {
  const quanti = Math.max(0, cfg.numPartecipanti - 1);
  const out: Avversario[] = [];
  for (let i = 0; i < quanti; i++) {
    const vecchio = esistenti[i];
    out.push(
      vecchio
        ? { ...vecchio, budgetIniziale: cfg.budgetTotale }
        : {
            id: `avv-${i + 1}`,
            nome:
              i < NOMI_AVVERSARI_DEFAULT.length
                ? NOMI_AVVERSARI_DEFAULT[i]
                : `Squadra ${i + 1}`,
            budgetIniziale: cfg.budgetTotale,
            speseManuali: 0,
            slotManuali: 0,
          },
    );
  }
  return out;
}
