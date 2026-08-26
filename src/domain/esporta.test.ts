import { describe, expect, it } from 'vitest';
import { NOTA_NIENTE_API, riepilogoTestuale, rosaInCsv, rosaInJson } from './esporta';
import { calcolaStatoBudget } from './budget';
import { calc, cfg } from './aiuti-test';

const rosa = [
  calc({ nome: 'Lautaro', squadra: 'Inter', ruolo: 'A', stato: 'acquistato', prezzoPagato: 120 }),
  calc({ nome: 'Kean', squadra: 'Fiorentina', ruolo: 'A', stato: 'acquistato', prezzoPagato: 40 }),
  calc({ nome: 'Maignan', squadra: 'Milan', ruolo: 'P', stato: 'acquistato', prezzoPagato: 18 }),
];

describe('export di fine asta (F13)', () => {
  it('produce il tracciato che si dà in pasto ai gestionali di lega', () => {
    const righe = rosaInCsv(rosa).split('\n');
    expect(righe[0]).toBe('Ruolo;Nome;Squadra;Prezzo');
    expect(righe[1]).toBe('P;Maignan;Milan;18');
    // dentro ogni ruolo, dal più caro al meno caro
    expect(righe[2]).toBe('A;Lautaro;Inter;120');
    expect(righe[3]).toBe('A;Kean;Fiorentina;40');
  });

  it('esporta una rosa vuota senza rompersi', () => {
    expect(rosaInCsv([])).toBe('Ruolo;Nome;Squadra;Prezzo');
  });

  it('il riepilogo testuale riporta totale speso e crediti avanzati', () => {
    const st = calcolaStatoBudget(rosa, cfg());
    const testo = riepilogoTestuale(rosa, cfg(), st);
    expect(testo).toContain('Totale speso: 178 / 500');
    expect(testo).toContain('Crediti avanzati: 322');
    expect(testo).toContain('Slot riempiti: 3 / 25');
    expect(testo).toContain('(nessuno)'); // i ruoli vuoti restano visibili
  });

  it('il JSON e valido e contiene i totali', () => {
    const st = calcolaStatoBudget(rosa, cfg());
    const dati = JSON.parse(rosaInJson(rosa, cfg(), st));
    expect(dati.rosa).toHaveLength(3);
    expect(dati.totali.speso).toBe(178);
    expect(dati.perRuolo.A.presi).toBe(2);
  });

  it('la nota sull assenza di API è esplicita', () => {
    expect(NOTA_NIENTE_API).toMatch(/non esiste un'api pubblica/i);
    expect(NOTA_NIENTE_API).toMatch(/manuale/i);
  });
});
