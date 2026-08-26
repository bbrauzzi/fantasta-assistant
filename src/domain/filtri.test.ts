import { describe, expect, it } from 'vitest';
import { cercaPerAstaRapida, filtra, ordina, type Filtri } from './filtri';
import { calc, cfg } from './aiuti-test';

const vuoti: Filtri = {
  query: '',
  ruolo: 'tutti',
  fascia: 'tutte',
  squadra: 'tutte',
  soloDisponibili: false,
  soloRigoristi: false,
  soloPiazzati: false,
};

const listone = [
  calc({ id: 'a', nome: 'Lautaro', squadra: 'Inter', ruolo: 'A', fascia: 'Top', quotazioneBase: 45, rigorista: true, probTitolare: 90 }),
  calc({ id: 'b', nome: 'Højlund', squadra: 'Napoli', ruolo: 'A', fascia: 'Semi-top', quotazioneBase: 16, probTitolare: 60 }),
  calc({ id: 'c', nome: 'Barella', squadra: 'Inter', ruolo: 'C', fascia: 'Semi-top', quotazioneBase: 17, probTitolare: 90 }),
  calc({ id: 'd', nome: 'Perso', squadra: 'Roma', ruolo: 'D', quotazioneBase: 8, stato: 'perso' }),
  calc({ id: 'e', nome: 'Mio', squadra: 'Roma', ruolo: 'D', quotazioneBase: 9, stato: 'obiettivo' }),
];

describe('filtra (F1)', () => {
  it('senza filtri restituisce tutto', () => {
    expect(filtra(listone, vuoti)).toHaveLength(5);
  });

  it('filtra per ruolo, fascia e squadra', () => {
    expect(filtra(listone, { ...vuoti, ruolo: 'A' })).toHaveLength(2);
    expect(filtra(listone, { ...vuoti, fascia: 'Top' })).toHaveLength(1);
    expect(filtra(listone, { ...vuoti, squadra: 'Inter' })).toHaveLength(2);
  });

  it('«solo disponibili» tiene i miei obiettivi e toglie chi e uscito', () => {
    const r = filtra(listone, { ...vuoti, soloDisponibili: true }).map((c) => c.id);
    expect(r).toContain('e');
    expect(r).not.toContain('d');
  });

  it('filtra i rigoristi', () => {
    expect(filtra(listone, { ...vuoti, soloRigoristi: true }).map((c) => c.id)).toEqual(['a']);
  });

  it('la ricerca e accent-insensitive', () => {
    expect(filtra(listone, { ...vuoti, query: 'hojlund' }).map((c) => c.id)).toEqual(['b']);
  });
});

describe('ordina (F1)', () => {
  it('ordina per prezzo consigliato decrescente', () => {
    const r = ordina(listone, 'consigliato', true, cfg()).map((c) => c.id);
    expect(r[0]).toBe('a');
  });

  it('inverte il verso', () => {
    const r = ordina(listone, 'consigliato', false, cfg()).map((c) => c.id);
    expect(r[r.length - 1]).toBe('a');
  });

  it('ordina per nome e per titolarita', () => {
    expect(ordina(listone, 'nome', false, cfg())[0].nome).toBe('Barella');
    expect(ordina(listone, 'probTitolare', true, cfg())[0].probTitolare).toBe(90);
  });

  it('con una ricerca attiva vince la pertinenza sull ordinamento di colonna', () => {
    const r = ordina(filtra(listone, { ...vuoti, query: 'inter' }), 'nome', false, cfg(), 'inter');
    // entrambi hanno la stessa pertinenza sulla squadra: decide la quotazione
    expect(r[0].id).toBe('a');
  });

  it('non muta l array di partenza', () => {
    const copia = [...listone];
    ordina(listone, 'nome', true, cfg());
    expect(listone).toEqual(copia);
  });
});

describe('cercaPerAstaRapida (F10)', () => {
  it('non restituisce nulla a query vuota', () => {
    expect(cercaPerAstaRapida(listone, '')).toHaveLength(0);
  });

  it('esclude chi e gia uscito dal mercato', () => {
    expect(cercaPerAstaRapida(listone, 'perso')).toHaveLength(0);
  });

  it('mette in cima il match piu pertinente', () => {
    expect(cercaPerAstaRapida(listone, 'lau')[0].id).toBe('a');
  });

  it('limita il numero di risultati', () => {
    const tanti = Array.from({ length: 20 }, (_, i) => calc({ ruolo: 'C', nome: `Rossi ${i}` }));
    expect(cercaPerAstaRapida(tanti, 'rossi')).toHaveLength(6);
    expect(cercaPerAstaRapida(tanti, 'rossi', 3)).toHaveLength(3);
  });
});
