/* Elenco dei moduli, estendibile senza toccare la UI: basta aggiungere una riga. */
import type { Ruolo } from '../types';

export interface Modulo {
  nome: string;
  /** quanti titolari per ruolo; il portiere e' sempre 1 */
  reparti: Record<Exclude<Ruolo, 'P'>, number>;
}

export const MODULI: readonly Modulo[] = [
  { nome: '3-4-3', reparti: { D: 3, C: 4, A: 3 } },
  { nome: '3-5-2', reparti: { D: 3, C: 5, A: 2 } },
  { nome: '3-4-1-2', reparti: { D: 3, C: 5, A: 2 } },
  { nome: '4-3-3', reparti: { D: 4, C: 3, A: 3 } },
  { nome: '4-4-2', reparti: { D: 4, C: 4, A: 2 } },
  { nome: '4-5-1', reparti: { D: 4, C: 5, A: 1 } },
  { nome: '4-3-1-2', reparti: { D: 4, C: 4, A: 2 } },
  { nome: '5-3-2', reparti: { D: 5, C: 3, A: 2 } },
  { nome: '5-4-1', reparti: { D: 5, C: 4, A: 1 } },
] as const;
