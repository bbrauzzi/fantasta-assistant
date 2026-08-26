/* Stato di interfaccia: selezione, bozze di offerta, finestre aperte.
   Volatile per scelta: non ha senso ritrovarlo dopo un ricaricamento. */

import { create } from 'zustand';
import type { Vista } from '../components/Navigazione';
import type { Calciatore, Fascia, Ruolo } from '../types';

export type Modale =
  | { tipo: 'nessuna' }
  | { tipo: 'aiuto' }
  | { tipo: 'assegna'; calciatore: Calciatore }
  | { tipo: 'conferma-acquisto'; calciatore: Calciatore; prezzo: number; motivo: string }
  | { tipo: 'import' }
  | { tipo: 'esporta' }
  | { tipo: 'nuovo-calciatore' };

interface StoreUI {
  vista: Vista;
  astaRapida: boolean;
  idSelezionato: string | null;
  /** riga aperta in modifica inline: durante l'asta cambio idea di continuo */
  idInModifica: string | null;
  modale: Modale;

  /** bozze del campo offerta, per id calciatore: vivono finche' non confermo */
  bozze: Record<string, string>;

  filtri: {
    query: string;
    ruolo: Ruolo | 'tutti';
    fascia: Fascia | 'tutte';
    squadra: string | 'tutte';
    soloDisponibili: boolean;
    soloRigoristi: boolean;
    soloPiazzati: boolean;
  };
  ordinamento: { campo: CampoOrdinamento; discendente: boolean };

  setVista: (v: Vista) => void;
  setAstaRapida: (v: boolean) => void;
  seleziona: (id: string | null) => void;
  apriModifica: (id: string | null) => void;
  setModale: (m: Modale) => void;
  chiudiModale: () => void;
  setBozza: (id: string, valore: string) => void;
  pulisciBozza: (id: string) => void;
  setFiltro: <K extends keyof StoreUI['filtri']>(k: K, v: StoreUI['filtri'][K]) => void;
  azzeraFiltri: () => void;
  ordinaPer: (campo: CampoOrdinamento) => void;
}

export type CampoOrdinamento =
  | 'nome'
  | 'squadra'
  | 'ruolo'
  | 'fascia'
  | 'probTitolare'
  | 'consigliato';

const FILTRI_VUOTI: StoreUI['filtri'] = {
  query: '',
  ruolo: 'tutti',
  fascia: 'tutte',
  squadra: 'tutte',
  soloDisponibili: false,
  soloRigoristi: false,
  soloPiazzati: false,
};

export const useUI = create<StoreUI>()((set) => ({
  vista: 'listone',
  astaRapida: false,
  idSelezionato: null,
  idInModifica: null,
  modale: { tipo: 'nessuna' },
  bozze: {},
  filtri: FILTRI_VUOTI,
  ordinamento: { campo: 'consigliato', discendente: true },

  setVista: (vista) => set({ vista }),
  setAstaRapida: (astaRapida) => set({ astaRapida }),
  seleziona: (idSelezionato) => set({ idSelezionato }),
  apriModifica: (idInModifica) =>
    set((s) => ({
      idInModifica: s.idInModifica === idInModifica ? null : idInModifica,
      idSelezionato: idInModifica ?? s.idSelezionato,
    })),
  setModale: (modale) => set({ modale }),
  chiudiModale: () => set({ modale: { tipo: 'nessuna' } }),
  setBozza: (id, valore) => set((s) => ({ bozze: { ...s.bozze, [id]: valore } })),
  pulisciBozza: (id) =>
    set((s) => {
      const bozze = { ...s.bozze };
      delete bozze[id];
      return { bozze };
    }),
  setFiltro: (k, v) => set((s) => ({ filtri: { ...s.filtri, [k]: v } })),
  azzeraFiltri: () => set({ filtri: FILTRI_VUOTI }),
  ordinaPer: (campo) =>
    set((s) => ({
      ordinamento: {
        campo,
        discendente: s.ordinamento.campo === campo ? !s.ordinamento.discendente : true,
      },
    })),
}));
