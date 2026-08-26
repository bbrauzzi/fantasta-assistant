/* ============================================================
   F9 - analisi della rosa.
   Sono constatazioni, non prescrizioni: "4 calciatori del Napoli
   in rosa", non "hai troppi calciatori del Napoli".
   ============================================================ */

import type { Calciatore, ConfigLega, Ruolo } from '../types';
import { RUOLI, RUOLO_LABEL, SOGLIA_TITOLARITA_DEBOLE } from './costanti';
import type { StatoBudget } from './budget';

export type LivelloSegnalazione = 'attenzione' | 'neutro';

export interface Segnalazione {
  livello: LivelloSegnalazione;
  testo: string;
  chiave: string;
}

export interface AnalisiRosa {
  rosa: Calciatore[];
  segnalazioni: Segnalazione[];
  /** quante segnalazioni di livello "attenzione": va nel badge della barra di stato */
  quanteAttenzioni: number;
  titolaritaMedia: number | null;
  titolaritaPerRuolo: Record<Ruolo, number | null>;
  rigoristi: number;
  perSquadra: Array<{ squadra: string; quanti: number }>;
  slotScoperti: Record<Ruolo, number>;
  creditoMedioPerSlot: number | null;
}

export function analizzaRosa(
  calciatori: Calciatore[],
  cfg: ConfigLega,
  st: StatoBudget,
): AnalisiRosa {
  const rosa = calciatori.filter((c) => c.stato === 'acquistato');
  const segnalazioni: Segnalazione[] = [];

  /* --- concentrazione per squadra reale: turnover, coppe, rinvii --- */
  const conteggio = new Map<string, number>();
  for (const c of rosa) conteggio.set(c.squadra, (conteggio.get(c.squadra) ?? 0) + 1);
  const perSquadra = [...conteggio.entries()]
    .map(([squadra, quanti]) => ({ squadra, quanti }))
    .sort((a, b) => b.quanti - a.quanti || a.squadra.localeCompare(b.squadra));

  for (const s of perSquadra) {
    if (s.quanti >= cfg.sogliaConcentrazioneSquadra) {
      segnalazioni.push({
        livello: 'attenzione',
        chiave: `squadra-${s.squadra}`,
        testo: `${s.quanti} calciatori del ${s.squadra} in rosa`,
      });
    }
  }

  /* --- rigoristi --- */
  const rigoristi = rosa.filter((c) => c.rigorista).length;
  if (rigoristi === 0 && rosa.length >= st.slotTotali / 2) {
    segnalazioni.push({
      livello: 'attenzione',
      chiave: 'rigoristi-zero',
      testo: 'Nessun rigorista in rosa, con la rosa oltre metà completata',
    });
  } else if (rosa.length > 0) {
    segnalazioni.push({
      livello: 'neutro',
      chiave: 'rigoristi',
      testo: `${rigoristi} rigorist${rigoristi === 1 ? 'a' : 'i'} in rosa`,
    });
  }

  /* --- titolarita' media, complessiva e per ruolo --- */
  const titolaritaMedia = media(rosa.map((c) => c.probTitolare));
  const titolaritaPerRuolo = {} as Record<Ruolo, number | null>;
  for (const r of RUOLI) {
    titolaritaPerRuolo[r] = media(rosa.filter((c) => c.ruolo === r).map((c) => c.probTitolare));
  }
  if (titolaritaMedia !== null) {
    segnalazioni.push({
      livello: titolaritaMedia < SOGLIA_TITOLARITA_DEBOLE ? 'attenzione' : 'neutro',
      chiave: 'titolarita',
      testo: `Titolarità media della rosa: ${titolaritaMedia}%`,
    });
  }

  /* --- spesa per ruolo rispetto al piano --- */
  for (const r of RUOLI) {
    const scarto = st.spesoPerRuolo[r] - st.budgetPerRuolo[r];
    if (scarto > 0) {
      segnalazioni.push({
        livello: 'attenzione',
        chiave: `quota-${r}`,
        testo: `${RUOLO_LABEL[r]}: ${scarto} crediti oltre la quota pianificata`,
      });
    }
  }

  /* --- slot scoperti e credito medio disponibile per ciascuno --- */
  const slotScoperti = {} as Record<Ruolo, number>;
  for (const r of RUOLI) {
    slotScoperti[r] = Math.max(0, cfg.slotPerRuolo[r] - st.presiPerRuolo[r]);
  }
  const creditoMedioPerSlot =
    st.slotDaRiempire > 0 ? Math.floor(st.residui / st.slotDaRiempire) : null;
  if (creditoMedioPerSlot !== null && rosa.length > 0) {
    segnalazioni.push({
      livello: 'neutro',
      chiave: 'medio-slot',
      testo: `${st.slotDaRiempire} slot scoperti, ${creditoMedioPerSlot} crediti in media per ciascuno`,
    });
  }

  return {
    rosa,
    segnalazioni,
    quanteAttenzioni: segnalazioni.filter((s) => s.livello === 'attenzione').length,
    titolaritaMedia,
    titolaritaPerRuolo,
    rigoristi,
    perSquadra,
    slotScoperti,
    creditoMedioPerSlot,
  };
}

function media(valori: number[]): number | null {
  if (valori.length === 0) return null;
  return Math.round(valori.reduce((s, v) => s + v, 0) / valori.length);
}
