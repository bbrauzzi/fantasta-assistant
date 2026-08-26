import { describe, expect, it } from 'vitest';
import { chiaveCalciatore, chiaveNome, corrisponde, normalizza, rilevanza } from './testo';

describe('normalizzazione', () => {
  it('toglie accenti e maiuscole', () => {
    expect(normalizza('Højlund')).toBe('hojlund');
    expect(normalizza('Calhanoglu')).toBe('calhanoglu');
    expect(normalizza('Çalhanoğlu')).toBe('calhanoglu');
    expect(normalizza("N'Dicka")).toBe('ndicka');
    expect(normalizza('Kolašinac')).toBe('kolasinac');
  });

  it('gestisce le lettere che NFD non scompone', () => {
    expect(normalizza('Ødegaard')).toBe('odegaard');
    expect(normalizza('Håland')).toBe('haland');
    expect(normalizza('Łukasz')).toBe('lukasz');
  });

  it('produce chiavi stabili per il merge dell import', () => {
    expect(chiaveCalciatore('Højlund', 'Napoli')).toBe(chiaveCalciatore('hojlund ', ' NAPOLI'));
    expect(chiaveNome("N'Dicka")).toBe(chiaveNome('Ndicka'));
  });
});

describe('ricerca (F1)', () => {
  it('trova ignorando accenti e maiuscole', () => {
    expect(corrisponde('hojlund', 'Højlund', 'Napoli')).toBe(true);
    expect(corrisponde('HOJ', 'Højlund', 'Napoli')).toBe(true);
  });

  it('tollera il match parziale sul cognome', () => {
    expect(corrisponde('paz', 'Nico Paz', 'Como')).toBe(true);
    expect(corrisponde('esposito', 'Esposito F.', 'Inter')).toBe(true);
  });

  it('cerca anche sulla squadra', () => {
    expect(corrisponde('inter', 'Lautaro', 'Inter')).toBe(true);
  });

  it('una query vuota non filtra niente', () => {
    expect(corrisponde('', 'Chiunque', 'Ovunque')).toBe(true);
  });

  it('non trova quello che non c e', () => {
    expect(corrisponde('messi', 'Lautaro', 'Inter')).toBe(false);
  });
});

describe('rilevanza: chi va in cima nell asta rapida', () => {
  it('premia il nome esatto, poi il prefisso, poi la parola interna', () => {
    expect(rilevanza('lautaro', 'Lautaro', 'Inter')).toBe(0);
    expect(rilevanza('lau', 'Lautaro', 'Inter')).toBe(1);
    expect(rilevanza('paz', 'Nico Paz', 'Como')).toBe(2);
    expect(rilevanza('aut', 'Lautaro', 'Inter')).toBe(3);
    expect(rilevanza('int', 'Lautaro', 'Inter')).toBe(4);
  });

  it('ordina correttamente due omonimi parziali', () => {
    const q = 'espo';
    expect(rilevanza(q, 'Esposito F.', 'Inter')).toBeLessThan(
      rilevanza(q, 'Pippo Esposito', 'Roma') + 1,
    );
  });
});
