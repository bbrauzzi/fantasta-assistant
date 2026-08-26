/* Scorciatoie globali. Requisito di primo livello, non un extra.
   Regola: non si attivano mentre sto scrivendo in un campo (tranne Esc). */

import { useEffect } from 'react';
import { useStore } from '../store/store';
import { useUI } from '../store/ui';

function stoScrivendo(e: KeyboardEvent): boolean {
  const t = e.target as HTMLElement | null;
  if (!t) return false;
  const tag = t.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || t.isContentEditable;
}

/** L'elenco attualmente visibile nel listone, pubblicato dalla vista. */
function listaVisibile(): string[] {
  return (window as unknown as { __listaVisibile?: string[] }).__listaVisibile ?? [];
}

export function useScorciatoie() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const ui = useUI.getState();
      const store = useStore.getState();
      const scrivendo = stoScrivendo(e);

      /* Esc funziona sempre, anche mentre scrivo */
      if (e.key === 'Escape') {
        if (ui.modale.tipo !== 'nessuna') {
          ui.chiudiModale();
          return;
        }
        if (scrivendo) {
          (e.target as HTMLElement).blur();
          return;
        }
        if (ui.astaRapida) ui.setAstaRapida(false);
        return;
      }

      /* Undo/redo valgono anche dentro un campo: in asta si sbaglia a digitare */
      const meta = e.ctrlKey || e.metaKey;
      if (meta && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) store.ripristina();
        else store.annulla();
        return;
      }

      if (scrivendo || meta || e.altKey) return;
      if (ui.modale.tipo !== 'nessuna') return;

      const selezionato = ui.idSelezionato
        ? (store.calciatori.find((c) => c.id === ui.idSelezionato) ?? null)
        : null;

      switch (e.key) {
        case '/':
          e.preventDefault();
          ui.setVista('listone');
          window.dispatchEvent(new Event('fantasta:cerca'));
          return;
        case '?':
          e.preventDefault();
          ui.setModale({ tipo: 'aiuto' });
          return;
        case 'ArrowDown':
        case 'ArrowUp': {
          const lista = listaVisibile();
          if (lista.length === 0) return;
          e.preventDefault();
          const i = ui.idSelezionato ? lista.indexOf(ui.idSelezionato) : -1;
          const passo = e.key === 'ArrowDown' ? 1 : -1;
          const prossimo = i < 0 ? 0 : Math.max(0, Math.min(lista.length - 1, i + passo));
          ui.seleziona(lista[prossimo]);
          return;
        }
        case 'Enter': {
          if (!selezionato) return;
          e.preventDefault();
          apriCampoOfferta(selezionato.id);
          return;
        }
        default:
          break;
      }

      switch (e.key.toLowerCase()) {
        case 'f':
          e.preventDefault();
          ui.setAstaRapida(!ui.astaRapida);
          return;
        case 'm':
          e.preventDefault();
          ui.setAstaRapida(false);
          ui.setVista('moduli');
          return;
        case 'a':
          if (!selezionato) return;
          e.preventDefault();
          apriCampoOfferta(selezionato.id);
          return;
        case 'v':
          if (!selezionato) return;
          e.preventDefault();
          ui.setModale({ tipo: 'assegna', calciatore: selezionato });
          return;
        case 's':
          if (!selezionato) return;
          e.preventDefault();
          store.scarta(selezionato.id);
          return;
        case 'o':
          if (!selezionato) return;
          e.preventDefault();
          store.alternaObiettivo(selezionato.id);
          return;
        case 'e':
          if (!selezionato) return;
          e.preventDefault();
          ui.setVista('listone');
          ui.apriModifica(selezionato.id);
          return;
        default:
          break;
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}

/** Porta il cursore nel campo offerta della riga selezionata: il simulatore
    si apre digitando, quindi basta mettere lì il fuoco senza usare il mouse. */
function apriCampoOfferta(id: string) {
  requestAnimationFrame(() => {
    const campo = document.querySelector<HTMLInputElement>(`[data-offerta="${CSS.escape(id)}"]`);
    campo?.focus();
    campo?.select();
  });
}
