import { describe, expect, it } from 'vitest';
import { calcolaAvversari, chiPuoRilanciare, conteggioPerSoglie, generaAvversari } from './avversari';
import { calc, cfg } from './aiuti-test';
import type { Avversario } from '../types';

const avv = (p: Partial<Avversario> & { id: string }): Avversario => ({
  nome: p.nome ?? p.id,
  budgetIniziale: p.budgetIniziale ?? 500,
  speseManuali: p.speseManuali ?? 0,
  slotManuali: p.slotManuali ?? 0,
  ...p,
});

describe('calcolaAvversari (F7)', () => {
  it('somma gli acquisti tracciati per giocatore', () => {
    const calciatori = [
      calc({ ruolo: 'A', stato: 'perso', acquirenteId: 'x', prezzoDiMercato: 120 }),
      calc({ ruolo: 'D', stato: 'perso', acquirenteId: 'x', prezzoDiMercato: 30 }),
      calc({ ruolo: 'C', stato: 'perso', acquirenteId: 'y', prezzoDiMercato: 40 }),
    ];
    const [x] = calcolaAvversari([avv({ id: 'x' })], calciatori, cfg());
    expect(x.speso).toBe(150);
    expect(x.residui).toBe(350);
    expect(x.slotOccupati).toBe(2);
    expect(x.presiPerRuolo).toEqual({ P: 0, D: 1, C: 0, A: 1 });
    expect(x.datiParziali).toBe(false);
  });

  it('marca come parziali i dati di chi ho contato solo alla svelta', () => {
    const [x] = calcolaAvversari([avv({ id: 'x', speseManuali: 90, slotManuali: 3 })], [], cfg());
    expect(x.datiParziali).toBe(true);
    expect(x.speso).toBe(90);
    expect(x.slotOccupati).toBe(3);
  });

  it('applica la stessa formula di max offerta che uso per me', () => {
    const [x] = calcolaAvversari([avv({ id: 'x', speseManuali: 300, slotManuali: 10 })], [], cfg());
    // 200 residui, 15 slot da riempire, minimo 1 -> 200 - 14
    expect(x.maxOfferta).toBe(186);
  });

  it('rileva i ruoli saturi', () => {
    const portieri = Array.from({ length: 3 }, () =>
      calc({ ruolo: 'P', stato: 'perso', acquirenteId: 'x', prezzoDiMercato: 5 }),
    );
    const [x] = calcolaAvversari([avv({ id: 'x' })], portieri, cfg());
    expect(x.ruoliSaturi).toEqual(['P']);
  });

  it('un avversario senza crediti ha max offerta negativa', () => {
    const [x] = calcolaAvversari([avv({ id: 'x', speseManuali: 500, slotManuali: 5 })], [], cfg());
    expect(x.residui).toBe(0);
    expect(x.maxOfferta).toBe(-19);
  });
});

describe('chiPuoRilanciare (F7)', () => {
  const avversari = calcolaAvversari(
    [
      avv({ id: 'ricco', speseManuali: 0, slotManuali: 0 }),
      avv({ id: 'medio', speseManuali: 400, slotManuali: 20 }),
      avv({ id: 'secco', speseManuali: 500, slotManuali: 24 }),
    ],
    [],
    cfg(),
  );

  it('separa chi ha capienza da chi e fuori', () => {
    // ricco: 476 di max offerta, medio: 96, secco: 0
    expect(chiPuoRilanciare(avversari, 90).possono.map((a) => a.id)).toEqual(['ricco', 'medio']);
    const esito = chiPuoRilanciare(avversari, 120);
    expect(esito.possono.map((a) => a.id)).toEqual(['ricco']);
    expect(esito.fuori.map((a) => a.id)).toEqual(['medio', 'secco']);
    expect(esito.totale).toBe(3);
  });

  it('ordina chi puo rilanciare per capienza decrescente', () => {
    const esito = chiPuoRilanciare(avversari, 0);
    expect(esito.possono.map((a) => a.maxOfferta)).toEqual([476, 96]);
  });

  it('esclude chi ha gia saturato quel ruolo', () => {
    const conPortieri = calcolaAvversari(
      [avv({ id: 'ricco' })],
      Array.from({ length: 3 }, () =>
        calc({ ruolo: 'P', stato: 'perso', acquirenteId: 'ricco', prezzoDiMercato: 1 }),
      ),
      cfg(),
    );
    expect(chiPuoRilanciare(conPortieri, 10, 'P').possono).toHaveLength(0);
    expect(chiPuoRilanciare(conPortieri, 10, 'A').possono).toHaveLength(1);
  });

  it('segnala quando la stima poggia su dati parziali', () => {
    const parziali = calcolaAvversari([avv({ id: 'x', speseManuali: 10, slotManuali: 1 })], [], cfg());
    expect(chiPuoRilanciare(parziali, 5).stimaIncerta).toBe(true);
  });

  it('il conteggio per soglie e monotono decrescente', () => {
    const conteggi = conteggioPerSoglie(avversari, [20, 40, 80, 140]).map((c) => c.quanti);
    for (let i = 1; i < conteggi.length; i++) {
      expect(conteggi[i]).toBeLessThanOrEqual(conteggi[i - 1]);
    }
  });
});

describe('generaAvversari', () => {
  it('crea una squadra in meno dei partecipanti: la mia non e un avversario', () => {
    expect(generaAvversari(cfg({ numPartecipanti: 8 }))).toHaveLength(7);
    expect(generaAvversari(cfg({ numPartecipanti: 2 }))).toHaveLength(1);
  });

  it('conserva i nomi e le spese gia inserite quando la lega si allarga', () => {
    const esistenti = generaAvversari(cfg({ numPartecipanti: 3 }));
    esistenti[0].nome = 'Il Ciccio';
    esistenti[0].speseManuali = 120;
    const dopo = generaAvversari(cfg({ numPartecipanti: 6 }), esistenti);
    expect(dopo).toHaveLength(5);
    expect(dopo[0].nome).toBe('Il Ciccio');
    expect(dopo[0].speseManuali).toBe(120);
  });

  it('allinea il budget iniziale se cambio il budget di lega', () => {
    const esistenti = generaAvversari(cfg());
    const dopo = generaAvversari(cfg({ budgetTotale: 300 }), esistenti);
    expect(dopo.every((a) => a.budgetIniziale === 300)).toBe(true);
  });

  it('con una lega di un solo partecipante non crea avversari', () => {
    expect(generaAvversari(cfg({ numPartecipanti: 1 }))).toHaveLength(0);
  });
});
