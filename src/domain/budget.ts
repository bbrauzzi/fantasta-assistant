/* ============================================================
   F2 - prezzo consigliato
   F4 - tracciamento budget
   F5 - crediti spendibili reali (max offerta)
   F6 - simulatore di offerta
   Funzioni pure: nessuna dipendenza da React o dallo store.
   ============================================================ */

import type { Calciatore, ConfigLega, Ruolo } from '../types';
import { RUOLI, RUOLO_LABEL } from './costanti';

export type PerRuolo<T> = Record<Ruolo, T>;

export function perRuoloZero(): PerRuolo<number> {
  return { P: 0, D: 0, C: 0, A: 0 };
}

/* ------------------------------ F2 ------------------------------ */

/**
 * Il listino ufficiale e' tarato su 500 crediti e 8 partecipanti.
 * Se la mia lega ha parametri diversi, la quotazione va riscalata:
 * piu' budget = prezzi piu' alti, piu' partecipanti = piu' domanda
 * sullo stesso numero di calciatori, quindi ancora prezzi piu' alti.
 * E' un riferimento, non un prezzo di mercato.
 */
export function prezzoConsigliato(quotazioneBase: number, cfg: ConfigLega): number {
  const scala = (cfg.budgetTotale / 500) * (cfg.numPartecipanti / 8);
  return Math.max(1, Math.round(quotazioneBase * scala));
}

/**
 * Scostamento percentuale di un'offerta rispetto al consigliato.
 * Dato neutro: non e' un giudizio sul prezzo.
 */
export function scostamento(offerta: number, consigliato: number): number {
  if (consigliato <= 0) return 0;
  return Math.round(((offerta - consigliato) / consigliato) * 100);
}

export function formattaScostamento(perc: number): string {
  return `${perc >= 0 ? '+' : ''}${perc}% sul consigliato`;
}

/* ------------------------------ F4 ------------------------------ */

/** Quanti crediti sono assegnati a ciascun ruolo dal piano di ripartizione. */
export function budgetPerRuolo(cfg: ConfigLega): PerRuolo<number> {
  const out = perRuoloZero();
  for (const r of RUOLI) {
    out[r] = Math.round((cfg.budgetTotale * cfg.percBudgetPerRuolo[r]) / 100);
  }
  return out;
}

export interface StatoBudget {
  spesoPerRuolo: PerRuolo<number>;
  presiPerRuolo: PerRuolo<number>;
  budgetPerRuolo: PerRuolo<number>;
  residuoPerRuolo: PerRuolo<number>;
  speso: number;
  residui: number;
  slotDaRiempire: number;
  slotTotali: number;
  slotRiempiti: number;
  maxOfferta: number;
  minSlot: number;
  /** Max offerta calcolata anche contro la quota del ruolo. */
  maxOffertaPerRuolo: PerRuolo<number>;
}

export function calcolaStatoBudget(calciatori: Calciatore[], cfg: ConfigLega): StatoBudget {
  const spesoPerRuolo = perRuoloZero();
  const presiPerRuolo = perRuoloZero();

  for (const c of calciatori) {
    if (c.stato !== 'acquistato') continue;
    presiPerRuolo[c.ruolo] += 1;
    spesoPerRuolo[c.ruolo] += c.prezzoPagato ?? 0;
  }

  const budget = budgetPerRuolo(cfg);
  const residuoPerRuolo = perRuoloZero();
  for (const r of RUOLI) residuoPerRuolo[r] = budget[r] - spesoPerRuolo[r];

  const speso = RUOLI.reduce((s, r) => s + spesoPerRuolo[r], 0);
  const residui = cfg.budgetTotale - speso;

  const slotTotali = RUOLI.reduce((s, r) => s + cfg.slotPerRuolo[r], 0);
  const slotRiempiti = RUOLI.reduce((s, r) => s + presiPerRuolo[r], 0);
  const slotDaRiempire = RUOLI.reduce(
    (s, r) => s + Math.max(0, cfg.slotPerRuolo[r] - presiPerRuolo[r]),
    0,
  );

  const maxOfferta = calcolaMaxOfferta(residui, slotDaRiempire, cfg.prezzoMinimoSlot);

  const maxOffertaPerRuolo = perRuoloZero();
  for (const r of RUOLI) {
    maxOffertaPerRuolo[r] = calcolaMaxOffertaRuolo(r, {
      residui,
      slotDaRiempire,
      minSlot: cfg.prezzoMinimoSlot,
      residuoRuolo: residuoPerRuolo[r],
      slotLiberiRuolo: Math.max(0, cfg.slotPerRuolo[r] - presiPerRuolo[r]),
    });
  }

  return {
    spesoPerRuolo,
    presiPerRuolo,
    budgetPerRuolo: budget,
    residuoPerRuolo,
    speso,
    residui,
    slotDaRiempire,
    slotTotali,
    slotRiempiti,
    maxOfferta,
    minSlot: cfg.prezzoMinimoSlot,
    maxOffertaPerRuolo,
  };
}

/* ------------------------------ F5 ------------------------------ */

/**
 * Il budget residuo grezzo inganna. Se mi restano 200 crediti ma devo
 * ancora riempire 7 slot, non posso offrirne 200: 6 di quei crediti sono
 * gia' impegnati per riempire gli altri 6 slot al prezzo minimo.
 *
 * Il -1 e' lo slot che sto per riempire con questa offerta: e' uno di
 * quelli contati in slotDaRiempire, quindi non va vincolato al minimo.
 */
export function calcolaMaxOfferta(residui: number, slotDaRiempire: number, minSlot: number): number {
  if (slotDaRiempire <= 0) return residui;
  return residui - (slotDaRiempire - 1) * minSlot;
}

/**
 * Max offerta per un singolo ruolo: e' il minore fra il vincolo globale
 * (F5) e quello che resta della quota di budget assegnata a quel ruolo.
 * La quota di ruolo e' un piano, non un muro: puo' essere negativa se
 * l'ho gia' sforata, e in quel caso lo si vede.
 */
export function calcolaMaxOffertaRuolo(
  _ruolo: Ruolo,
  d: {
    residui: number;
    slotDaRiempire: number;
    minSlot: number;
    residuoRuolo: number;
    slotLiberiRuolo: number;
  },
): number {
  const globale = calcolaMaxOfferta(d.residui, d.slotDaRiempire, d.minSlot);
  // dentro il ruolo restano altri slot da coprire: anche loro costano almeno il minimo
  const vincoloRuolo =
    d.slotLiberiRuolo > 0 ? d.residuoRuolo - (d.slotLiberiRuolo - 1) * d.minSlot : d.residuoRuolo;
  return Math.min(globale, vincoloRuolo);
}

/** Testo del tooltip che spiega perche' i due numeri divergono. */
export function spiegaMaxOfferta(st: StatoBudget): string {
  if (st.slotDaRiempire <= 0) return 'Rosa completa: puoi offrire tutti i crediti residui.';
  const vincolati = (st.slotDaRiempire - 1) * st.minSlot;
  return `${st.residui} residui, ma ${st.slotDaRiempire} slot da riempire: ${vincolati} vincolati al minimo.`;
}

/* ------------------------------ F6 ------------------------------ */

export type GravitaAvviso = 'nessuno' | 'attenzione' | 'blocco';

export interface Simulazione {
  offerta: number;
  /** crediti che mi resterebbero dopo questo acquisto */
  residuiDopo: number;
  /** max offerta che mi resterebbe per gli acquisti successivi */
  maxOffertaDopo: number;
  /** budget del ruolo che mi resterebbe */
  residuoRuoloDopo: number;
  slotDopo: number;
  /** credito medio disponibile per ciascuno slot ancora scoperto */
  medioPerSlot: number | null;
  scostamentoPerc: number;
  consigliato: number;
  sforaQuotaRuolo: boolean;
  nonRiempieSlot: boolean;
  sforaTotale: boolean;
  gravita: GravitaAvviso;
  avviso: string | null;
  /** lo sforo del budget totale e' quasi sempre un errore di battitura */
  richiedeConferma: boolean;
}

/**
 * Simula un'offerta senza confermare nulla. Ricalcolata a ogni carattere
 * digitato: deve restare una funzione pura e velocissima.
 */
export function simulaOfferta(
  offerta: number,
  ruolo: Ruolo,
  quotazioneBase: number,
  st: StatoBudget,
  cfg: ConfigLega,
): Simulazione {
  const consigliato = prezzoConsigliato(quotazioneBase, cfg);
  const residuiDopo = st.residui - offerta;
  const residuoRuoloDopo = st.residuoPerRuolo[ruolo] - offerta;
  const slotDopo = Math.max(0, st.slotDaRiempire - 1);
  const maxOffertaDopo = calcolaMaxOfferta(residuiDopo, slotDopo, st.minSlot);

  const sforaTotale = residuiDopo < 0;
  // dopo l'acquisto devo comunque poter riempire gli slot rimasti al minimo
  const nonRiempieSlot = !sforaTotale && residuiDopo < slotDopo * st.minSlot;
  const sforaQuotaRuolo = residuoRuoloDopo < 0;

  let gravita: GravitaAvviso = 'nessuno';
  let avviso: string | null = null;
  if (sforaTotale) {
    gravita = 'blocco';
    avviso = `⚠ sfori il budget totale di ${Math.abs(residuiDopo)} crediti`;
  } else if (nonRiempieSlot) {
    gravita = 'blocco';
    avviso = `⚠ non riempiresti tutti gli slot: ne restano ${slotDopo} con ${residuiDopo} crediti`;
  } else if (sforaQuotaRuolo) {
    gravita = 'attenzione';
    avviso = `⚠ oltre la quota ${RUOLO_LABEL[ruolo].toLowerCase()} di ${Math.abs(residuoRuoloDopo)} crediti`;
  }

  return {
    offerta,
    residuiDopo,
    maxOffertaDopo,
    residuoRuoloDopo,
    slotDopo,
    medioPerSlot: slotDopo > 0 ? Math.floor(residuiDopo / slotDopo) : null,
    scostamentoPerc: scostamento(offerta, consigliato),
    consigliato,
    sforaQuotaRuolo,
    nonRiempieSlot,
    sforaTotale,
    gravita,
    avviso,
    richiedeConferma: sforaTotale,
  };
}
