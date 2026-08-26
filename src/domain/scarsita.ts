/* ============================================================
   F8 - scarsita': quanti calciatori restano sul mercato per
   ruolo e per fascia, e quanti ne servono ancora a tutta la lega.
   ============================================================ */

import type { Calciatore, ConfigLega, Fascia, Ruolo } from '../types';
import { FASCE, RUOLI } from './costanti';
import { sulMercato } from './obiettivi';

export interface CellaScarsita {
  rimasti: number;
  /** i Top rimasti sono meno delle squadre che li stanno cercando */
  sottoDomanda: boolean;
}

export interface Scarsita {
  matrice: Record<Ruolo, Record<Fascia, CellaScarsita>>;
  /** slot di quel ruolo che tutta la lega deve ancora riempire */
  domandaResidua: Record<Ruolo, number>;
  rimastiPerRuolo: Record<Ruolo, number>;
}

/**
 * Domanda residua della lega su un ruolo: i miei slot scoperti piu' quelli
 * degli avversari. Degli avversari conosco solo cio' che ho tracciato, quindi
 * sottraggo gli acquisti che ho registrato come "persi": e' una stima per
 * eccesso, ed e' giusto che lo sia (mi tiene sul lato prudente).
 */
export function domandaResiduaLega(
  calciatori: Calciatore[],
  cfg: ConfigLega,
  ruolo: Ruolo,
): number {
  const mieiPresi = calciatori.filter((c) => c.ruolo === ruolo && c.stato === 'acquistato').length;
  const mieiMancanti = Math.max(0, cfg.slotPerRuolo[ruolo] - mieiPresi);

  const altreSquadre = Math.max(0, cfg.numPartecipanti - 1);
  const slotAltri = altreSquadre * cfg.slotPerRuolo[ruolo];
  const presiDaAltri = calciatori.filter((c) => c.ruolo === ruolo && c.stato === 'perso').length;

  return mieiMancanti + Math.max(0, slotAltri - presiDaAltri);
}

export function calcolaScarsita(calciatori: Calciatore[], cfg: ConfigLega): Scarsita {
  const matrice = {} as Record<Ruolo, Record<Fascia, CellaScarsita>>;
  const rimastiPerRuolo = { P: 0, D: 0, C: 0, A: 0 } as Record<Ruolo, number>;
  const domandaResidua = { P: 0, D: 0, C: 0, A: 0 } as Record<Ruolo, number>;

  for (const r of RUOLI) {
    domandaResidua[r] = domandaResiduaLega(calciatori, cfg, r);
    const perFascia = {} as Record<Fascia, CellaScarsita>;
    for (const f of FASCE) {
      const rimasti = calciatori.filter(
        (c) => c.ruolo === r && c.fascia === f && sulMercato(c),
      ).length;
      perFascia[f] = {
        rimasti,
        // il confronto vale sulle fasce alte: e' li' che la scarsita' morde
        sottoDomanda:
          (f === 'Top' || f === 'Semi-top') && rimasti > 0 && rimasti < cfg.numPartecipanti,
      };
      rimastiPerRuolo[r] += rimasti;
    }
    matrice[r] = perFascia;
  }

  return { matrice, domandaResidua, rimastiPerRuolo };
}
