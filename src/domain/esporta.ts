/* ============================================================
   F13 - export di fine asta.
   Nota: NON esiste un'API pubblica di Fantacalcio.it o Leghe
   Fantacalcio a cui collegarsi. Il caricamento in lega resta
   manuale, via import CSV dal pannello admin.
   ============================================================ */

import type { Calciatore, ConfigLega, Ruolo } from '../types';
import { RUOLI, RUOLO_LABEL } from './costanti';
import type { StatoBudget } from './budget';

/** Tracciato atteso dai gestionali di lega: Ruolo;Nome;Squadra;Prezzo */
export function rosaInCsv(rosa: Calciatore[]): string {
  const righe = ['Ruolo;Nome;Squadra;Prezzo'];
  for (const r of RUOLI) {
    for (const c of rosa
      .filter((x) => x.ruolo === r)
      .sort((a, b) => (b.prezzoPagato ?? 0) - (a.prezzoPagato ?? 0))) {
      righe.push(`${c.ruolo};${c.nome};${c.squadra};${c.prezzoPagato ?? 0}`);
    }
  }
  return righe.join('\n');
}

/** Riepilogo testuale copiabile, da incollare in chat di lega. */
export function riepilogoTestuale(
  rosa: Calciatore[],
  cfg: ConfigLega,
  st: StatoBudget,
): string {
  const out: string[] = ['ROSA FINALE', ''];
  for (const r of RUOLI) {
    const gruppo = rosa
      .filter((c) => c.ruolo === r)
      .sort((a, b) => (b.prezzoPagato ?? 0) - (a.prezzoPagato ?? 0));
    out.push(
      `${RUOLO_LABEL[r].toUpperCase()} (${gruppo.length}/${cfg.slotPerRuolo[r]}) — ${st.spesoPerRuolo[r]} cr`,
    );
    if (gruppo.length === 0) out.push('  (nessuno)');
    for (const c of gruppo) {
      out.push(`  ${c.nome} (${c.squadra}) — ${c.prezzoPagato ?? 0}`);
    }
    out.push('');
  }
  out.push(`Totale speso: ${st.speso} / ${cfg.budgetTotale} crediti`);
  out.push(`Crediti avanzati: ${st.residui}`);
  out.push(`Slot riempiti: ${st.slotRiempiti} / ${st.slotTotali}`);
  return out.join('\n');
}

export function rosaInJson(rosa: Calciatore[], cfg: ConfigLega, st: StatoBudget): string {
  return JSON.stringify(
    {
      esportatoIl: new Date().toISOString(),
      config: cfg,
      totali: {
        speso: st.speso,
        residui: st.residui,
        slotRiempiti: st.slotRiempiti,
        slotTotali: st.slotTotali,
      },
      rosa: rosa.map((c) => ({
        ruolo: c.ruolo,
        nome: c.nome,
        squadra: c.squadra,
        fascia: c.fascia,
        rigorista: c.rigorista,
        probTitolare: c.probTitolare,
        quotazioneBase: c.quotazioneBase,
        prezzoPagato: c.prezzoPagato,
        note: c.note,
      })),
      perRuolo: Object.fromEntries(
        RUOLI.map((r: Ruolo) => [
          r,
          { presi: st.presiPerRuolo[r], speso: st.spesoPerRuolo[r], slot: cfg.slotPerRuolo[r] },
        ]),
      ),
    },
    null,
    2,
  );
}

export const NOTA_NIENTE_API =
  "Non esiste un'API pubblica di Fantacalcio.it o Leghe Fantacalcio: il caricamento della rosa in lega resta manuale, tramite l'import CSV del pannello admin (Gestione rose → Importa).";
