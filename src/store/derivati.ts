/* Valori derivati dallo store. Nessun calcolo qui dentro: tutto viene
   da src/domain/, questo file si limita a memoizzare. */

import { useMemo } from 'react';
import { useStore } from './store';
import { calcolaStatoBudget } from '../domain/budget';
import { calcolaScarsita } from '../domain/scarsita';
import { calcolaAvversari } from '../domain/avversari';
import { analizzaRosa } from '../domain/rosa';
import { confrontaModuli, guadagnoPerRuolo } from '../domain/moduli';
import { ordinaDaRivedere } from '../domain/listone';

export function useStatoBudget() {
  const calciatori = useStore((s) => s.calciatori);
  const config = useStore((s) => s.config);
  return useMemo(() => calcolaStatoBudget(calciatori, config), [calciatori, config]);
}

export function useScarsita() {
  const calciatori = useStore((s) => s.calciatori);
  const config = useStore((s) => s.config);
  return useMemo(() => calcolaScarsita(calciatori, config), [calciatori, config]);
}

export function useAvversariCalcolati() {
  const calciatori = useStore((s) => s.calciatori);
  const avversari = useStore((s) => s.avversari);
  const config = useStore((s) => s.config);
  return useMemo(
    () => calcolaAvversari(avversari, calciatori, config),
    [avversari, calciatori, config],
  );
}

export function useAnalisiRosa() {
  const calciatori = useStore((s) => s.calciatori);
  const config = useStore((s) => s.config);
  const st = useStatoBudget();
  return useMemo(() => analizzaRosa(calciatori, config, st), [calciatori, config, st]);
}

export function useRosa() {
  const calciatori = useStore((s) => s.calciatori);
  return useMemo(() => calciatori.filter((c) => c.stato === 'acquistato'), [calciatori]);
}

export function useModuli() {
  const rosa = useRosa();
  return useMemo(
    () => ({ formazioni: confrontaModuli(rosa), guadagni: guadagnoPerRuolo(rosa) }),
    [rosa],
  );
}

/** Calciatori marcati "da rivedere" dopo un aggiornamento del listone. */
export function useDaRivedere() {
  const calciatori = useStore((s) => s.calciatori);
  return useMemo(
    () =>
      calciatori
        .filter((c) => c.daRivedere && !c.daRivedere.visto)
        .sort(ordinaDaRivedere),
    [calciatori],
  );
}

export function useConteggi() {
  const calciatori = useStore((s) => s.calciatori);
  return useMemo(
    () => ({
      obiettivi: calciatori.filter((c) => c.stato === 'obiettivo').length,
      rosa: calciatori.filter((c) => c.stato === 'acquistato').length,
      totale: calciatori.length,
    }),
    [calciatori],
  );
}
