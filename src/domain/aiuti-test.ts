/* Costruttori usati solo dai test: creano calciatori e configurazioni
   senza dover ripetere tutti i campi ogni volta. */

import type { Calciatore, ConfigLega, Fascia, Ruolo } from '../types';
import { CONFIG_DEFAULT } from './costanti';

let n = 0;

export function calc(p: Partial<Calciatore> & { ruolo: Ruolo }): Calciatore {
  n += 1;
  return {
    id: p.id ?? `t${n}`,
    nome: p.nome ?? `Giocatore ${n}`,
    squadra: p.squadra ?? 'Squadra A',
    ruolo: p.ruolo,
    fascia: (p.fascia ?? 'Terza fascia') as Fascia,
    rigorista: p.rigorista ?? false,
    rigoristaIncerto: p.rigoristaIncerto ?? false,
    tiratorePunizioni: p.tiratorePunizioni ?? false,
    probTitolare: p.probTitolare ?? 70,
    quotazioneBase: p.quotazioneBase ?? 10,
    stato: p.stato ?? 'disponibile',
    prezzoPagato: p.prezzoPagato ?? null,
    prezzoDiMercato: p.prezzoDiMercato ?? null,
    acquirenteId: p.acquirenteId ?? null,
    note: p.note ?? '',
    ordineObiettivo: p.ordineObiettivo ?? 0,
    daRivedere: p.daRivedere ?? null,
    modificatiAMano: p.modificatiAMano ?? [],
  };
}

export function cfg(p: Partial<ConfigLega> = {}): ConfigLega {
  return { ...CONFIG_DEFAULT, ...p };
}
