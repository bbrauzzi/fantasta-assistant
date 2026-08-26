import { describe, expect, it } from 'vitest';
import {
  calcolaMaxOfferta,
  calcolaStatoBudget,
  prezzoConsigliato,
  scostamento,
  simulaOfferta,
  spiegaMaxOfferta,
} from './budget';
import { calc, cfg } from './aiuti-test';

describe('prezzoConsigliato (F2)', () => {
  it('lascia invariata la quotazione sulla scala di listino 500/8', () => {
    expect(prezzoConsigliato(45, cfg())).toBe(45);
  });

  it('scala col budget e col numero di partecipanti', () => {
    expect(prezzoConsigliato(45, cfg({ budgetTotale: 1000 }))).toBe(90);
    expect(prezzoConsigliato(20, cfg({ numPartecipanti: 12 }))).toBe(30);
    expect(prezzoConsigliato(20, cfg({ budgetTotale: 250, numPartecipanti: 4 }))).toBe(5);
  });

  it('non scende mai sotto 1 credito', () => {
    expect(prezzoConsigliato(1, cfg({ budgetTotale: 50 }))).toBe(1);
    expect(prezzoConsigliato(0, cfg())).toBe(1);
  });

  it('regge valori estremi di configurazione', () => {
    expect(prezzoConsigliato(10, cfg({ budgetTotale: 100000, numPartecipanti: 2 }))).toBe(500);
    expect(prezzoConsigliato(10, cfg({ numPartecipanti: 2 }))).toBe(3);
  });
});

describe('scostamento sul consigliato', () => {
  it('calcola sopra e sotto', () => {
    expect(scostamento(69, 50)).toBe(38);
    expect(scostamento(25, 50)).toBe(-50);
    expect(scostamento(50, 50)).toBe(0);
  });

  it('non divide per zero', () => {
    expect(scostamento(10, 0)).toBe(0);
  });
});

describe('calcolaMaxOfferta (F5)', () => {
  it('vincola al minimo tutti gli slot tranne quello che sto riempiendo', () => {
    // 200 residui, 7 slot da riempire, minimo 1: 6 crediti sono impegnati
    expect(calcolaMaxOfferta(200, 7, 1)).toBe(194);
  });

  it('con un solo slot rimasto posso offrire tutto', () => {
    expect(calcolaMaxOfferta(200, 1, 1)).toBe(200);
  });

  it('con rosa completa non c e alcun vincolo', () => {
    expect(calcolaMaxOfferta(37, 0, 1)).toBe(37);
  });

  it('rispetta un prezzo minimo di slot diverso da 1', () => {
    expect(calcolaMaxOfferta(200, 7, 5)).toBe(170);
  });

  it('puo restituire un numero negativo: e proprio quello che devo vedere', () => {
    expect(calcolaMaxOfferta(3, 10, 1)).toBe(-6);
  });
});

describe('calcolaStatoBudget (F4)', () => {
  const listone = [
    calc({ ruolo: 'A', stato: 'acquistato', prezzoPagato: 120 }),
    calc({ ruolo: 'A', stato: 'acquistato', prezzoPagato: 60 }),
    calc({ ruolo: 'P', stato: 'acquistato', prezzoPagato: 15 }),
    calc({ ruolo: 'C', stato: 'obiettivo' }),
    calc({ ruolo: 'D' }),
  ];

  it('somma spesa e slot solo sugli acquistati', () => {
    const st = calcolaStatoBudget(listone, cfg());
    expect(st.speso).toBe(195);
    expect(st.residui).toBe(305);
    expect(st.presiPerRuolo).toEqual({ P: 1, D: 0, C: 0, A: 2 });
    expect(st.slotRiempiti).toBe(3);
    expect(st.slotTotali).toBe(25);
    expect(st.slotDaRiempire).toBe(22);
  });

  it('deriva il budget di ruolo dalle percentuali', () => {
    const st = calcolaStatoBudget(listone, cfg());
    expect(st.budgetPerRuolo).toEqual({ P: 25, D: 75, C: 150, A: 250 });
    expect(st.residuoPerRuolo.A).toBe(70);
    expect(st.residuoPerRuolo.P).toBe(10);
  });

  it('la max offerta di ruolo non supera mai il vincolo globale', () => {
    const st = calcolaStatoBudget(listone, cfg());
    expect(st.maxOfferta).toBe(305 - 21);
    // il ruolo A ha 70 residui e 4 slot liberi: 70 - 3 = 67, sotto il globale
    expect(st.maxOffertaPerRuolo.A).toBe(67);
  });

  it('con budget esaurito la max offerta va sotto zero', () => {
    const secchi = [calc({ ruolo: 'A', stato: 'acquistato', prezzoPagato: 500 })];
    const st = calcolaStatoBudget(secchi, cfg());
    expect(st.residui).toBe(0);
    expect(st.slotDaRiempire).toBe(24);
    expect(st.maxOfferta).toBe(-23);
  });

  it('con zero slot residui non applica alcun vincolo', () => {
    const st = calcolaStatoBudget([], cfg({ slotPerRuolo: { P: 0, D: 0, C: 0, A: 0 } }));
    expect(st.slotDaRiempire).toBe(0);
    expect(st.maxOfferta).toBe(500);
    expect(spiegaMaxOfferta(st)).toContain('Rosa completa');
  });
});

describe('simulaOfferta (F6)', () => {
  const base = () =>
    calcolaStatoBudget([calc({ ruolo: 'A', stato: 'acquistato', prezzoPagato: 100 })], cfg());

  it('proietta residui, max offerta e slot dopo l acquisto', () => {
    const st = base();
    const sim = simulaOfferta(50, 'C', 30, st, cfg());
    expect(sim.residuiDopo).toBe(350);
    expect(sim.slotDopo).toBe(23);
    expect(sim.maxOffertaDopo).toBe(350 - 22);
    expect(sim.medioPerSlot).toBe(Math.floor(350 / 23));
  });

  it('non segnala nulla quando l offerta sta dentro tutti i vincoli', () => {
    const sim = simulaOfferta(20, 'C', 20, base(), cfg());
    expect(sim.gravita).toBe('nessuno');
    expect(sim.avviso).toBeNull();
    expect(sim.richiedeConferma).toBe(false);
  });

  it('segnala in ambra lo sforo della sola quota di ruolo', () => {
    // quota P = 25 crediti: offrirne 40 sfora il ruolo ma non il totale
    const sim = simulaOfferta(40, 'P', 16, base(), cfg());
    expect(sim.sforaQuotaRuolo).toBe(true);
    expect(sim.gravita).toBe('attenzione');
    expect(sim.avviso).toContain('oltre la quota');
    expect(sim.richiedeConferma).toBe(false);
  });

  it('segnala in rosso quando non riuscirei piu a riempire gli slot', () => {
    const st = base();
    const sim = simulaOfferta(390, 'A', 45, st, cfg());
    expect(sim.nonRiempieSlot).toBe(true);
    expect(sim.gravita).toBe('blocco');
    // avvisa ma non blocca: la seconda conferma serve solo sullo sforo totale
    expect(sim.richiedeConferma).toBe(false);
  });

  it('chiede la seconda conferma solo quando sforo il budget totale', () => {
    const sim = simulaOfferta(450, 'A', 45, base(), cfg());
    expect(sim.sforaTotale).toBe(true);
    expect(sim.gravita).toBe('blocco');
    expect(sim.richiedeConferma).toBe(true);
    expect(sim.avviso).toContain('budget totale');
  });

  it('con l ultimo slot da riempire non calcola una media per slot', () => {
    const quasiPiena = Array.from({ length: 24 }, () =>
      calc({ ruolo: 'D', stato: 'acquistato', prezzoPagato: 10 }),
    );
    const st = calcolaStatoBudget(quasiPiena, cfg({ slotPerRuolo: { P: 0, D: 25, C: 0, A: 0 } }));
    const sim = simulaOfferta(50, 'D', 10, st, cfg({ slotPerRuolo: { P: 0, D: 25, C: 0, A: 0 } }));
    expect(sim.slotDopo).toBe(0);
    expect(sim.medioPerSlot).toBeNull();
  });
});
