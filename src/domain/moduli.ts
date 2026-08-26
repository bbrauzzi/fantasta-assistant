/* ============================================================
   F15 - formazioni per modulo, copertura, vista campo.
   Serve anche a rosa incompleta: durante l'asta e' li' che vale.
   ============================================================ */

import type { Calciatore, Ruolo } from '../types';
import { RANGO_FASCIA, RUOLI, RUOLO_SINGOLARE, SOGLIA_TITOLARITA_DEBOLE } from './costanti';
import { MODULI, type Modulo } from './moduli-config';

export { MODULI };
export type { Modulo };

/**
 * Punteggio di un calciatore per la scelta dell'undici.
 * Domina la probabilita' di essere titolare (chi non gioca non fa punti);
 * la fascia pesa a parita' di titolarita'; il rigorista vale un pelo di piu'.
 */
export function punteggioTitolare(c: Calciatore): number {
  return c.probTitolare + (3 - RANGO_FASCIA[c.fascia]) * 2 + (c.rigorista ? 6 : 0);
}

export interface CasellaCampo {
  calciatore: Calciatore;
  /** titolarita' sotto soglia: la casella va marcata */
  debole: boolean;
}

export interface FormazioneModulo {
  modulo: Modulo;
  /** titolari per reparto, gia' ordinati */
  undici: Record<Ruolo, CasellaCampo[]>;
  panchina: Calciatore[];
  /** ruoli in cui non ho abbastanza calciatori */
  mancanti: Array<{ ruolo: Ruolo; quanti: number }>;
  completo: boolean;
  /** 0-100: quanto la rosa regge il modulo */
  copertura: number;
  caselleDeboli: number;
  titolaritaMedia: number | null;
}

function fabbisogno(m: Modulo): Record<Ruolo, number> {
  return { P: 1, D: m.reparti.D, C: m.reparti.C, A: m.reparti.A };
}

export function costruisciFormazione(rosa: Calciatore[], modulo: Modulo): FormazioneModulo {
  const need = fabbisogno(modulo);
  const ordinati = (r: Ruolo) =>
    rosa.filter((c) => c.ruolo === r).sort((a, b) => punteggioTitolare(b) - punteggioTitolare(a));

  const undici = {} as Record<Ruolo, CasellaCampo[]>;
  const panchina: Calciatore[] = [];
  const mancanti: Array<{ ruolo: Ruolo; quanti: number }> = [];

  for (const r of RUOLI) {
    const disponibili = ordinati(r);
    const scelti = disponibili.slice(0, need[r]);
    undici[r] = scelti.map((c) => ({
      calciatore: c,
      debole: c.probTitolare < SOGLIA_TITOLARITA_DEBOLE,
    }));
    panchina.push(...disponibili.slice(need[r]));
    if (scelti.length < need[r]) mancanti.push({ ruolo: r, quanti: need[r] - scelti.length });
  }

  const schierati = RUOLI.flatMap((r) => undici[r].map((x) => x.calciatore));
  const totaleSlot = RUOLI.reduce((s, r) => s + need[r], 0);

  /* La copertura non e' "quanti giocatori ho": e' quanta titolarita' riesco a
     mettere in campo rispetto agli 11 slot. Uno slot vuoto vale 0, uno slot
     coperto da un 30% vale 0,3: cosi' il numero distingue una rosa completa
     ma fragile da una incompleta ma solida. */
  const copertura =
    totaleSlot === 0
      ? 0
      : Math.round((schierati.reduce((s, c) => s + c.probTitolare, 0) / (totaleSlot * 100)) * 100);

  return {
    modulo,
    undici,
    panchina: panchina.sort((a, b) => punteggioTitolare(b) - punteggioTitolare(a)),
    mancanti,
    completo: mancanti.length === 0,
    copertura,
    caselleDeboli: schierati.filter((c) => c.probTitolare < SOGLIA_TITOLARITA_DEBOLE).length,
    titolaritaMedia:
      schierati.length === 0
        ? null
        : Math.round(schierati.reduce((s, c) => s + c.probTitolare, 0) / schierati.length),
  };
}

export function confrontaModuli(rosa: Calciatore[], moduli: readonly Modulo[] = MODULI) {
  return moduli
    .map((m) => costruisciFormazione(rosa, m))
    .sort((a, b) => b.copertura - a.copertura || a.modulo.nome.localeCompare(b.modulo.nome));
}

export interface GuadagnoCopertura {
  ruolo: Ruolo;
  guadagno: number;
  moduliCompletati: string[];
}

/**
 * Quale ruolo darebbe il maggior guadagno di copertura con un acquisto in piu'.
 * Simulo l'aggiunta di un titolare "medio" (75% di titolarita', terza fascia):
 * non e' una previsione su chi comprero', e' la misura di quanto quello slot
 * mi sta costando adesso. Constatazione, non istruzione su cosa comprare.
 */
export function guadagnoPerRuolo(
  rosa: Calciatore[],
  moduli: readonly Modulo[] = MODULI,
): GuadagnoCopertura[] {
  const base = moduli.map((m) => costruisciFormazione(rosa, m));
  const coperturaBase = mediaCopertura(base);
  const completiBase = new Set(base.filter((f) => f.completo).map((f) => f.modulo.nome));

  return RUOLI.map((ruolo) => {
    const finto: Calciatore = {
      id: '__ipotetico__',
      nome: 'Ipotetico',
      squadra: '',
      ruolo,
      fascia: 'Terza fascia',
      rigorista: false,
      rigoristaIncerto: false,
      tiratorePunizioni: false,
      probTitolare: 75,
      quotazioneBase: 1,
      stato: 'acquistato',
      prezzoPagato: 0,
      prezzoDiMercato: null,
      acquirenteId: null,
      note: '',
      ordineObiettivo: 0,
      daRivedere: null,
      modificatiAMano: [],
    };
    const dopo = moduli.map((m) => costruisciFormazione([...rosa, finto], m));
    return {
      ruolo,
      guadagno: Math.round((mediaCopertura(dopo) - coperturaBase) * 10) / 10,
      moduliCompletati: dopo
        .filter((f) => f.completo && !completiBase.has(f.modulo.nome))
        .map((f) => f.modulo.nome),
    };
  }).sort((a, b) => b.moduliCompletati.length - a.moduliCompletati.length || b.guadagno - a.guadagno);
}

function mediaCopertura(formazioni: FormazioneModulo[]): number {
  if (formazioni.length === 0) return 0;
  return formazioni.reduce((s, f) => s + f.copertura, 0) / formazioni.length;
}

/** La constatazione in oro in fondo alla card "Copertura per modulo". */
export function frasiGuadagno(g: GuadagnoCopertura[]): string | null {
  const migliore = g[0];
  if (!migliore) return null;
  if (migliore.moduliCompletati.length > 0) {
    const lista = migliore.moduliCompletati.join(' e ');
    return `Un ${RUOLO_SINGOLARE[migliore.ruolo]} in più completerebbe ${lista}`;
  }
  if (migliore.guadagno <= 0) return null;
  return `Un ${RUOLO_SINGOLARE[migliore.ruolo]} in più alzerebbe la copertura media di ${migliore.guadagno} punti`;
}

/**
 * Deficit da mostrare accanto alla barra: "–1 C".
 * A rosa quasi vuota mancherebbero tutti i reparti e l'etichetta andrebbe a capo
 * tre volte: oltre due ruoli si riassume nel totale degli slot scoperti.
 */
export function etichettaDeficit(f: FormazioneModulo): string | null {
  if (f.completo) return null;
  if (f.mancanti.length > 2) {
    const totale = f.mancanti.reduce((s, m) => s + m.quanti, 0);
    return `–${totale} slot`;
  }
  return f.mancanti.map((m) => `–${m.quanti} ${m.ruolo}`).join(' ');
}
