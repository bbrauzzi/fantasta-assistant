import { describe, expect, it } from 'vitest';
import { autoRimpiazza, generaObiettivi, raggruppaObiettivi, riordinaObiettivi } from './obiettivi';
import { RUOLO_LABEL } from './costanti';
import { calc, cfg } from './aiuti-test';

const soloAttaccanti = cfg({ slotPerRuolo: { P: 0, D: 0, C: 0, A: 2 } });

describe('generaObiettivi (F3)', () => {
  it('riempie gli slot scoperti coi migliori disponibili', () => {
    const listone = [
      calc({ id: 'top', ruolo: 'A', fascia: 'Top', probTitolare: 80 }),
      calc({ id: 'semi', ruolo: 'A', fascia: 'Semi-top', probTitolare: 90 }),
      calc({ id: 'terzo', ruolo: 'A', fascia: 'Terza fascia', probTitolare: 95 }),
    ];
    const { calciatori, promossi } = generaObiettivi(listone, soloAttaccanti);
    expect(promossi.map((c) => c.id)).toEqual(['top', 'semi']);
    expect(calciatori.find((c) => c.id === 'terzo')!.stato).toBe('disponibile');
  });

  it('a parita di fascia sceglie chi ha piu probabilita di essere titolare', () => {
    const listone = [
      calc({ id: 'a', ruolo: 'A', fascia: 'Top', probTitolare: 60 }),
      calc({ id: 'b', ruolo: 'A', fascia: 'Top', probTitolare: 90 }),
    ];
    const { promossi } = generaObiettivi(listone, cfg({ slotPerRuolo: { P: 0, D: 0, C: 0, A: 1 } }));
    expect(promossi[0].id).toBe('b');
  });

  it('non cancella gli obiettivi che ho messo io a mano', () => {
    const listone = [
      calc({ id: 'mio', ruolo: 'A', fascia: 'Scommessa', stato: 'obiettivo', ordineObiettivo: 1 }),
      calc({ id: 'forte', ruolo: 'A', fascia: 'Top', probTitolare: 90 }),
      calc({ id: 'altro', ruolo: 'A', fascia: 'Semi-top', probTitolare: 80 }),
    ];
    const { calciatori, promossi } = generaObiettivi(listone, soloAttaccanti);
    expect(calciatori.find((c) => c.id === 'mio')!.stato).toBe('obiettivo');
    // resta un solo slot scoperto: aggiunge uno solo
    expect(promossi.map((c) => c.id)).toEqual(['forte']);
  });

  it('conta anche gli acquistati come slot coperti', () => {
    const listone = [
      calc({ id: 'preso', ruolo: 'A', stato: 'acquistato', prezzoPagato: 30 }),
      calc({ id: 'preso2', ruolo: 'A', stato: 'acquistato', prezzoPagato: 20 }),
      calc({ id: 'libero', ruolo: 'A', fascia: 'Top' }),
    ];
    const { promossi } = generaObiettivi(listone, soloAttaccanti);
    expect(promossi).toHaveLength(0);
  });

  it('non fa nulla se non restano candidati disponibili', () => {
    const listone = [calc({ ruolo: 'A', stato: 'scartato' })];
    const { promossi, calciatori } = generaObiettivi(listone, soloAttaccanti);
    expect(promossi).toHaveLength(0);
    expect(calciatori).toBe(listone);
  });
});

describe('autoRimpiazzo (F3)', () => {
  it('promuove il miglior disponibile quando lo slot resta scoperto', () => {
    const listone = [
      calc({ id: 'perso', ruolo: 'A', stato: 'perso' }),
      calc({ id: 'buono', ruolo: 'A', fascia: 'Semi-top', probTitolare: 80 }),
      calc({ id: 'scarso', ruolo: 'A', fascia: 'Scommessa', probTitolare: 40 }),
    ];
    const { calciatori, promosso } = autoRimpiazza(listone, soloAttaccanti, 'A');
    expect(promosso!.id).toBe('buono');
    expect(calciatori.find((c) => c.id === 'buono')!.stato).toBe('obiettivo');
  });

  it('non promuove nessuno se lo slot e gia coperto', () => {
    const listone = [
      calc({ id: 'ob1', ruolo: 'A', stato: 'obiettivo' }),
      calc({ id: 'ob2', ruolo: 'A', stato: 'obiettivo' }),
      calc({ id: 'libero', ruolo: 'A', fascia: 'Top' }),
    ];
    const { promosso } = autoRimpiazza(listone, soloAttaccanti, 'A');
    expect(promosso).toBeNull();
  });

  it('non promuove nessuno quando non restano candidati', () => {
    const listone = [
      calc({ id: 'perso', ruolo: 'A', stato: 'perso' }),
      calc({ id: 'scartato', ruolo: 'A', stato: 'scartato' }),
    ];
    const { calciatori, promosso } = autoRimpiazza(listone, soloAttaccanti, 'A');
    expect(promosso).toBeNull();
    expect(calciatori).toBe(listone);
  });

  it('mette il rimpiazzo in fondo alla lista, non in testa', () => {
    const listone = [
      calc({ id: 'primo', ruolo: 'A', stato: 'obiettivo', ordineObiettivo: 1 }),
      calc({ id: 'nuovo', ruolo: 'A', fascia: 'Top' }),
    ];
    const { calciatori } = autoRimpiazza(listone, soloAttaccanti, 'A');
    expect(calciatori.find((c) => c.id === 'nuovo')!.ordineObiettivo).toBe(2);
  });
});

describe('raggruppaObiettivi e riordino', () => {
  it('segnala le alternative quando gli obiettivi superano gli slot', () => {
    const listone = [
      calc({ ruolo: 'A', stato: 'obiettivo', ordineObiettivo: 1 }),
      calc({ ruolo: 'A', stato: 'obiettivo', ordineObiettivo: 2 }),
      calc({ ruolo: 'A', stato: 'obiettivo', ordineObiettivo: 3 }),
    ];
    const gruppi = raggruppaObiettivi(listone, soloAttaccanti, RUOLO_LABEL);
    const attaccanti = gruppi.find((g) => g.ruolo === 'A')!;
    expect(attaccanti.alternative).toBe(1);
    expect(attaccanti.intestazione).toContain('3/2 obiettivi, 1 alternativa');
  });

  it('lo spostamento riscrive l ordine di tutto il gruppo', () => {
    const listone = [
      calc({ id: 'a', ruolo: 'A', stato: 'obiettivo', ordineObiettivo: 1 }),
      calc({ id: 'b', ruolo: 'A', stato: 'obiettivo', ordineObiettivo: 2 }),
      calc({ id: 'c', ruolo: 'A', stato: 'obiettivo', ordineObiettivo: 3 }),
    ];
    const dopo = riordinaObiettivi(listone, 'A', 'c', 0);
    const ordine = dopo
      .slice()
      .sort((x, y) => x.ordineObiettivo - y.ordineObiettivo)
      .map((c) => c.id);
    expect(ordine).toEqual(['c', 'a', 'b']);
  });

  it('lo spostamento fuori range viene riportato dentro i limiti', () => {
    const listone = [
      calc({ id: 'a', ruolo: 'A', stato: 'obiettivo', ordineObiettivo: 1 }),
      calc({ id: 'b', ruolo: 'A', stato: 'obiettivo', ordineObiettivo: 2 }),
    ];
    const dopo = riordinaObiettivi(listone, 'A', 'a', 99);
    expect(dopo.find((c) => c.id === 'a')!.ordineObiettivo).toBe(2);
  });

  it('ignora uno spostamento su un id che non e fra gli obiettivi', () => {
    const listone = [calc({ id: 'a', ruolo: 'A', stato: 'disponibile' })];
    expect(riordinaObiettivi(listone, 'A', 'a', 0)).toBe(listone);
  });
});
