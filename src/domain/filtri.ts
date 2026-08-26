/* Filtro e ordinamento del listone. Puro, cosi' e' testabile e riusabile
   dall'asta rapida senza duplicare la logica di ricerca. */

import type { Calciatore, ConfigLega, Fascia, Ruolo } from '../types';
import { RANGO_FASCIA } from './costanti';
import { corrisponde, rilevanza } from './testo';
import { prezzoConsigliato } from './budget';

export interface Filtri {
  query: string;
  ruolo: Ruolo | 'tutti';
  fascia: Fascia | 'tutte';
  squadra: string | 'tutte';
  soloDisponibili: boolean;
  soloRigoristi: boolean;
  soloPiazzati: boolean;
}

export type CampoOrdinamento =
  | 'nome'
  | 'squadra'
  | 'ruolo'
  | 'fascia'
  | 'probTitolare'
  | 'consigliato';

export function filtra(calciatori: Calciatore[], f: Filtri): Calciatore[] {
  return calciatori.filter((c) => {
    if (f.ruolo !== 'tutti' && c.ruolo !== f.ruolo) return false;
    if (f.fascia !== 'tutte' && c.fascia !== f.fascia) return false;
    if (f.squadra !== 'tutte' && c.squadra !== f.squadra) return false;
    if (f.soloRigoristi && !c.rigorista) return false;
    // "piazzati" = chiunque batta un pallone fermo: rigori o punizioni
    if (f.soloPiazzati && !c.rigorista && !c.tiratorePunizioni) return false;
    // "solo disponibili" nasconde chi e' uscito dal mercato, non i miei obiettivi
    if (f.soloDisponibili && c.stato !== 'disponibile' && c.stato !== 'obiettivo') return false;
    return corrisponde(f.query, c.nome, c.squadra);
  });
}

export function ordina(
  calciatori: Calciatore[],
  campo: CampoOrdinamento,
  discendente: boolean,
  cfg: ConfigLega,
  query = '',
): Calciatore[] {
  // con una ricerca attiva conta la pertinenza, non l'ordinamento di colonna
  if (query.trim()) {
    return [...calciatori].sort(
      (a, b) =>
        rilevanza(query, a.nome, a.squadra) - rilevanza(query, b.nome, b.squadra) ||
        b.quotazioneBase - a.quotazioneBase,
    );
  }

  const verso = discendente ? -1 : 1;
  const ordinati = [...calciatori].sort((a, b) => {
    switch (campo) {
      case 'nome':
        return a.nome.localeCompare(b.nome) * verso;
      case 'squadra':
        return (a.squadra.localeCompare(b.squadra) || a.nome.localeCompare(b.nome)) * verso;
      case 'ruolo':
        return ('PDCA'.indexOf(a.ruolo) - 'PDCA'.indexOf(b.ruolo)) * verso;
      case 'fascia':
        return (RANGO_FASCIA[b.fascia] - RANGO_FASCIA[a.fascia]) * verso;
      case 'probTitolare':
        return (a.probTitolare - b.probTitolare) * verso;
      case 'consigliato':
      default:
        return (
          (prezzoConsigliato(a.quotazioneBase, cfg) - prezzoConsigliato(b.quotazioneBase, cfg)) *
          verso
        );
    }
  });
  return ordinati;
}

/** Risultati dell'asta rapida: chi e' ancora sul mercato, per pertinenza. */
export function cercaPerAstaRapida(
  calciatori: Calciatore[],
  query: string,
  massimo = 6,
): Calciatore[] {
  if (!query.trim()) return [];
  return calciatori
    .filter((c) => c.stato !== 'acquistato' && c.stato !== 'perso')
    .filter((c) => corrisponde(query, c.nome, c.squadra))
    .sort(
      (a, b) =>
        rilevanza(query, a.nome, a.squadra) - rilevanza(query, b.nome, b.squadra) ||
        b.quotazioneBase - a.quotazioneBase,
    )
    .slice(0, massimo);
}
