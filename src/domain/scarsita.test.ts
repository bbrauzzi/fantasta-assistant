import { describe, expect, it } from 'vitest';
import { calcolaScarsita, domandaResiduaLega } from './scarsita';
import { calc, cfg } from './aiuti-test';

describe('calcolaScarsita (F8)', () => {
  it('conta solo chi e ancora sul mercato', () => {
    const listone = [
      calc({ ruolo: 'A', fascia: 'Top' }),
      calc({ ruolo: 'A', fascia: 'Top', stato: 'obiettivo' }),
      calc({ ruolo: 'A', fascia: 'Top', stato: 'perso' }),
      calc({ ruolo: 'A', fascia: 'Top', stato: 'acquistato', prezzoPagato: 40 }),
      calc({ ruolo: 'A', fascia: 'Top', stato: 'scartato' }),
    ];
    expect(calcolaScarsita(listone, cfg()).matrice.A.Top.rimasti).toBe(2);
  });

  it('marca in rosso le fasce alte sotto il numero di squadre', () => {
    const pochi = Array.from({ length: 3 }, () => calc({ ruolo: 'A', fascia: 'Top' }));
    const s = calcolaScarsita(pochi, cfg({ numPartecipanti: 8 }));
    expect(s.matrice.A.Top.sottoDomanda).toBe(true);

    const tanti = Array.from({ length: 12 }, () => calc({ ruolo: 'A', fascia: 'Top' }));
    expect(calcolaScarsita(tanti, cfg()).matrice.A.Top.sottoDomanda).toBe(false);
  });

  it('non marca le fasce basse: li la scarsita non morde', () => {
    const pochi = Array.from({ length: 2 }, () => calc({ ruolo: 'A', fascia: 'Scommessa' }));
    expect(calcolaScarsita(pochi, cfg()).matrice.A.Scommessa.sottoDomanda).toBe(false);
  });

  it('non marca una fascia gia esaurita: non c e piu niente da segnalare', () => {
    expect(calcolaScarsita([], cfg()).matrice.A.Top.sottoDomanda).toBe(false);
  });
});

describe('domandaResiduaLega', () => {
  it('somma i miei slot scoperti e quelli stimati degli altri', () => {
    // 8 partecipanti, 6 slot A ciascuno: 7 avversari x 6 = 42, piu' i miei 6
    expect(domandaResiduaLega([], cfg(), 'A')).toBe(48);
  });

  it('scala con gli acquisti degli avversari che ho tracciato', () => {
    const listone = Array.from({ length: 10 }, () => calc({ ruolo: 'A', stato: 'perso' }));
    expect(domandaResiduaLega(listone, cfg(), 'A')).toBe(48 - 10);
  });

  it('scala con i miei acquisti', () => {
    const listone = Array.from({ length: 2 }, () =>
      calc({ ruolo: 'A', stato: 'acquistato', prezzoPagato: 10 }),
    );
    expect(domandaResiduaLega(listone, cfg(), 'A')).toBe(46);
  });

  it('non scende sotto zero anche se ho tracciato piu acquisti del previsto', () => {
    const listone = Array.from({ length: 100 }, () => calc({ ruolo: 'A', stato: 'perso' }));
    expect(domandaResiduaLega(listone, cfg(), 'A')).toBe(6);
  });
});
