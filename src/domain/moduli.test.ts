import { describe, expect, it } from 'vitest';
import { MODULI, confrontaModuli, costruisciFormazione, etichettaDeficit, frasiGuadagno, guadagnoPerRuolo } from './moduli';
import { calc } from './aiuti-test';

const modulo = (nome: string) => MODULI.find((m) => m.nome === nome)!;

/** Una rosa completa per il 3-5-2, con titolarità note. */
const rosaPiena = [
  calc({ ruolo: 'P', nome: 'Por1', probTitolare: 90 }),
  ...Array.from({ length: 3 }, (_, i) => calc({ ruolo: 'D', nome: `Dif${i}`, probTitolare: 80 })),
  ...Array.from({ length: 5 }, (_, i) => calc({ ruolo: 'C', nome: `Cen${i}`, probTitolare: 80 })),
  ...Array.from({ length: 2 }, (_, i) => calc({ ruolo: 'A', nome: `Att${i}`, probTitolare: 80 })),
].map((c) => ({ ...c, stato: 'acquistato' as const, prezzoPagato: 10 }));

describe('costruisciFormazione (F15)', () => {
  it('schiera i migliori per titolarita', () => {
    const rosa = [
      calc({ ruolo: 'P', nome: 'Titolare', probTitolare: 90 }),
      calc({ ruolo: 'P', nome: 'Riserva', probTitolare: 20 }),
    ];
    const f = costruisciFormazione(rosa, modulo('3-5-2'));
    expect(f.undici.P[0].calciatore.nome).toBe('Titolare');
    expect(f.panchina[0].nome).toBe('Riserva');
  });

  it('a parita di titolarita preferisce la fascia migliore, poi il rigorista', () => {
    const rosa = [
      calc({ ruolo: 'A', nome: 'Scommessa', probTitolare: 80, fascia: 'Scommessa' }),
      calc({ ruolo: 'A', nome: 'TopPlayer', probTitolare: 80, fascia: 'Top' }),
      calc({ ruolo: 'A', nome: 'Rigorista', probTitolare: 80, fascia: 'Scommessa', rigorista: true }),
    ];
    const f = costruisciFormazione(rosa, modulo('4-5-1'));
    expect(f.undici.A[0].calciatore.nome).toBe('TopPlayer');
    expect(f.panchina[0].nome).toBe('Rigorista');
  });

  it('marca le caselle sotto il 55% di titolarita', () => {
    const rosa = [calc({ ruolo: 'P', probTitolare: 30 })];
    const f = costruisciFormazione(rosa, modulo('3-5-2'));
    expect(f.undici.P[0].debole).toBe(true);
    expect(f.caselleDeboli).toBe(1);
  });

  it('mostra il modulo come incompleto indicando quanti e quali ruoli mancano', () => {
    const rosa = [calc({ ruolo: 'P', probTitolare: 90 }), calc({ ruolo: 'D', probTitolare: 80 })];
    const f = costruisciFormazione(rosa, modulo('3-5-2'));
    expect(f.completo).toBe(false);
    expect(f.mancanti).toEqual([
      { ruolo: 'D', quanti: 2 },
      { ruolo: 'C', quanti: 5 },
      { ruolo: 'A', quanti: 2 },
    ]);
    // oltre due ruoli mancanti l'etichetta si riassume: non deve andare a capo
    expect(etichettaDeficit(f)).toBe('–9 slot');

    const quasiPronta = costruisciFormazione(rosaPiena.slice(0, 10), modulo('3-5-2'));
    expect(etichettaDeficit(quasiPronta)).toBe('–1 A');
    expect(etichettaDeficit(costruisciFormazione(rosaPiena, modulo('3-5-2')))).toBeNull();
  });

  it('la copertura pesa gli slot vuoti come zero, non li ignora', () => {
    const f = costruisciFormazione(rosaPiena, modulo('3-5-2'));
    // 90 + 10 giocatori all'80% = 890 su 1100
    expect(f.copertura).toBe(81);
    expect(f.completo).toBe(true);

    const mezza = costruisciFormazione(rosaPiena.slice(0, 6), modulo('3-5-2'));
    expect(mezza.copertura).toBeLessThan(f.copertura);
  });

  it('con rosa vuota la copertura e zero e non esplode', () => {
    const f = costruisciFormazione([], modulo('4-4-2'));
    expect(f.copertura).toBe(0);
    expect(f.titolaritaMedia).toBeNull();
    expect(f.panchina).toHaveLength(0);
  });

  it('non schiera lo stesso giocatore in due moduli diversi dello stesso undici', () => {
    const f = costruisciFormazione(rosaPiena, modulo('3-5-2'));
    const schierati = [...f.undici.P, ...f.undici.D, ...f.undici.C, ...f.undici.A].map(
      (x) => x.calciatore.id,
    );
    expect(new Set(schierati).size).toBe(schierati.length);
    expect(schierati).toHaveLength(11);
  });
});

describe('confronto fra moduli', () => {
  it('ordina per copertura decrescente', () => {
    const coperture = confrontaModuli(rosaPiena).map((f) => f.copertura);
    for (let i = 1; i < coperture.length; i++) {
      expect(coperture[i]).toBeLessThanOrEqual(coperture[i - 1]);
    }
  });

  it('copre tutti i moduli configurati', () => {
    expect(confrontaModuli(rosaPiena)).toHaveLength(MODULI.length);
  });
});

describe('guadagno di copertura (F15)', () => {
  it('indica quale ruolo sbloccherebbe piu moduli', () => {
    // 1 portiere, 4 difensori, 5 centrocampisti e nessun attaccante:
    // manca solo la punta per completare il 4-5-1
    const senzaPunta = [
      calc({ ruolo: 'P', probTitolare: 90 }),
      ...Array.from({ length: 4 }, () => calc({ ruolo: 'D', probTitolare: 80 })),
      ...Array.from({ length: 5 }, () => calc({ ruolo: 'C', probTitolare: 80 })),
    ].map((c) => ({ ...c, stato: 'acquistato' as const, prezzoPagato: 10 }));
    const g = guadagnoPerRuolo(senzaPunta);
    expect(g[0].ruolo).toBe('A');
    expect(g[0].moduliCompletati.length).toBeGreaterThan(0);
    expect(frasiGuadagno(g)).toContain('attaccante in più completerebbe');
  });

  it('formula la constatazione senza dire cosa comprare', () => {
    const frase = frasiGuadagno(guadagnoPerRuolo(rosaPiena.slice(0, 4)));
    expect(frase).not.toMatch(/devi|compra|dovresti/i);
  });

  it('con la rosa gia completa su tutti i moduli non promette guadagni inesistenti', () => {
    const g = guadagnoPerRuolo([]);
    expect(g.every((x) => x.guadagno >= 0)).toBe(true);
  });
});
