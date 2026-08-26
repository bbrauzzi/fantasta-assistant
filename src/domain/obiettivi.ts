/* ============================================================
   F3 - lista obiettivi: generazione, riordino, auto-rimpiazzo.
   ============================================================ */

import type { Calciatore, ConfigLega, Ruolo } from '../types';
import { RANGO_FASCIA, RUOLI } from './costanti';

/** Un calciatore e' ancora sul mercato finche' non e' stato preso o scartato. */
export function sulMercato(c: Calciatore): boolean {
  return c.stato === 'disponibile' || c.stato === 'obiettivo';
}

/**
 * Ordine di preferenza fra candidati: prima la fascia, poi la probabilita'
 * di essere titolare, poi la quotazione. A parita' di tutto, il nome, cosi'
 * l'ordinamento e' deterministico (serve ai test e a non far ballare la lista).
 */
export function confrontaCandidati(a: Calciatore, b: Calciatore): number {
  return (
    RANGO_FASCIA[a.fascia] - RANGO_FASCIA[b.fascia] ||
    b.probTitolare - a.probTitolare ||
    b.quotazioneBase - a.quotazioneBase ||
    a.nome.localeCompare(b.nome)
  );
}

export function miglioreDisponibile(
  calciatori: Calciatore[],
  ruolo: Ruolo,
  escludiIds: Set<string> = new Set(),
): Calciatore | null {
  const candidati = calciatori
    .filter((c) => c.ruolo === ruolo && c.stato === 'disponibile' && !escludiIds.has(c.id))
    .sort(confrontaCandidati);
  return candidati[0] ?? null;
}

/** Quanti slot di quel ruolo non sono ancora coperti ne' da acquisti ne' da obiettivi. */
export function slotScopertiPerObiettivi(
  calciatori: Calciatore[],
  cfg: ConfigLega,
  ruolo: Ruolo,
): number {
  const coperti = calciatori.filter(
    (c) => c.ruolo === ruolo && (c.stato === 'acquistato' || c.stato === 'obiettivo'),
  ).length;
  return cfg.slotPerRuolo[ruolo] - coperti;
}

/**
 * Riempie gli slot mancanti scegliendo i migliori disponibili.
 * NON azzera gli obiettivi gia' presenti: rigenerare significa aggiungere
 * cio' che manca, non cancellare la mia scala di priorita'.
 */
export function generaObiettivi(
  calciatori: Calciatore[],
  cfg: ConfigLega,
): { calciatori: Calciatore[]; promossi: Calciatore[] } {
  const promossi: Calciatore[] = [];
  const promossiIds = new Set<string>();

  for (const r of RUOLI) {
    const mancanti = slotScopertiPerObiettivi(calciatori, cfg, r);
    if (mancanti <= 0) continue;
    const candidati = calciatori
      .filter((c) => c.ruolo === r && c.stato === 'disponibile')
      .sort(confrontaCandidati)
      .slice(0, mancanti);
    for (const c of candidati) {
      promossi.push(c);
      promossiIds.add(c.id);
    }
  }

  if (promossi.length === 0) return { calciatori, promossi };

  const prossimoOrdine = massimoOrdine(calciatori);
  let n = 0;
  const aggiornati = calciatori.map((c) =>
    promossiIds.has(c.id)
      ? { ...c, stato: 'obiettivo' as const, ordineObiettivo: prossimoOrdine + ++n }
      : c,
  );
  return { calciatori: aggiornati, promossi };
}

function massimoOrdine(calciatori: Calciatore[]): number {
  return calciatori.reduce((m, c) => Math.max(m, c.ordineObiettivo), 0);
}

/**
 * Auto-rimpiazzo: un obiettivo e' uscito dal mercato (preso da un avversario
 * o scartato da me) e lo slot di ruolo e' rimasto scoperto. Promuovo il
 * miglior candidato disponibile. Restituisco anche chi ho promosso, perche'
 * il cambiamento va segnalato: mai silenzioso.
 */
export function autoRimpiazza(
  calciatori: Calciatore[],
  cfg: ConfigLega,
  ruolo: Ruolo,
): { calciatori: Calciatore[]; promosso: Calciatore | null } {
  if (slotScopertiPerObiettivi(calciatori, cfg, ruolo) <= 0) {
    return { calciatori, promosso: null };
  }
  const candidato = miglioreDisponibile(calciatori, ruolo);
  if (!candidato) return { calciatori, promosso: null };

  const ordine = massimoOrdine(calciatori) + 1;
  const aggiornati = calciatori.map((c) =>
    c.id === candidato.id ? { ...c, stato: 'obiettivo' as const, ordineObiettivo: ordine } : c,
  );
  return { calciatori: aggiornati, promosso: { ...candidato, stato: 'obiettivo' } };
}

export interface GruppoObiettivi {
  ruolo: Ruolo;
  obiettivi: Calciatore[];
  slot: number;
  /** obiettivi oltre gli slot: sono alternative, non un errore */
  alternative: number;
  intestazione: string;
}

/** Obiettivi raggruppati per ruolo, nell'ordine che ho deciso io. */
export function raggruppaObiettivi(
  calciatori: Calciatore[],
  cfg: ConfigLega,
  label: Record<Ruolo, string>,
): GruppoObiettivi[] {
  return RUOLI.map((r) => {
    const obiettivi = calciatori
      .filter((c) => c.ruolo === r && c.stato === 'obiettivo')
      .sort((a, b) => a.ordineObiettivo - b.ordineObiettivo || confrontaCandidati(a, b));
    const slot = cfg.slotPerRuolo[r];
    const alternative = Math.max(0, obiettivi.length - slot);
    const intestazione =
      alternative > 0
        ? `${label[r]} — ${obiettivi.length}/${slot} obiettivi, ${alternative} alternativ${alternative === 1 ? 'a' : 'e'}`
        : `${label[r]} — ${obiettivi.length}/${slot} obiettivi`;
    return { ruolo: r, obiettivi, slot, alternative, intestazione };
  });
}

/**
 * Sposta un obiettivo dentro il suo ruolo. L'ordine e' la mia scala di
 * priorita' e conta piu' di qualsiasi ordinamento automatico, quindi lo
 * riscrivo esplicitamente su tutto il gruppo.
 */
export function riordinaObiettivi(
  calciatori: Calciatore[],
  ruolo: Ruolo,
  idTrascinato: string,
  indiceDestinazione: number,
): Calciatore[] {
  const gruppo = calciatori
    .filter((c) => c.ruolo === ruolo && c.stato === 'obiettivo')
    .sort((a, b) => a.ordineObiettivo - b.ordineObiettivo || confrontaCandidati(a, b));

  const da = gruppo.findIndex((c) => c.id === idTrascinato);
  if (da < 0) return calciatori;

  const dest = Math.max(0, Math.min(gruppo.length - 1, indiceDestinazione));
  const [mosso] = gruppo.splice(da, 1);
  gruppo.splice(dest, 0, mosso);

  const nuovoOrdine = new Map(gruppo.map((c, i) => [c.id, i + 1]));
  return calciatori.map((c) =>
    nuovoOrdine.has(c.id) ? { ...c, ordineObiettivo: nuovoOrdine.get(c.id)! } : c,
  );
}
