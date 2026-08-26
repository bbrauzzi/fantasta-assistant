import { describe, expect, it } from 'vitest';
import { analizzaRosa } from './rosa';
import { calcolaStatoBudget } from './budget';
import { calc, cfg } from './aiuti-test';
import type { Calciatore, ConfigLega } from '../types';

const analizza = (calciatori: Calciatore[], config: ConfigLega = cfg()) =>
  analizzaRosa(calciatori, config, calcolaStatoBudget(calciatori, config));

const preso = (p: Parameters<typeof calc>[0]) =>
  calc({ ...p, stato: 'acquistato', prezzoPagato: p.prezzoPagato ?? 10 });

describe('analizzaRosa (F9)', () => {
  it('segnala la concentrazione oltre la soglia configurata', () => {
    const rosa = Array.from({ length: 4 }, () => preso({ ruolo: 'C', squadra: 'Napoli' }));
    const a = analizza(rosa);
    expect(a.segnalazioni.some((s) => s.testo === '4 calciatori del Napoli in rosa')).toBe(true);
    expect(a.perSquadra[0]).toEqual({ squadra: 'Napoli', quanti: 4 });
  });

  it('non segnala sotto la soglia', () => {
    const rosa = Array.from({ length: 3 }, () => preso({ ruolo: 'C', squadra: 'Napoli' }));
    expect(analizza(rosa).segnalazioni.some((s) => s.chiave.startsWith('squadra-'))).toBe(false);
  });

  it('rispetta una soglia di concentrazione personalizzata', () => {
    const rosa = Array.from({ length: 3 }, () => preso({ ruolo: 'C', squadra: 'Napoli' }));
    const a = analizza(rosa, cfg({ sogliaConcentrazioneSquadra: 3 }));
    expect(a.segnalazioni.some((s) => s.chiave === 'squadra-Napoli')).toBe(true);
  });

  it('segnala lo zero rigoristi solo oltre meta rosa', () => {
    const poca = Array.from({ length: 3 }, () => preso({ ruolo: 'C' }));
    expect(analizza(poca).segnalazioni.some((s) => s.chiave === 'rigoristi-zero')).toBe(false);

    const tanta = Array.from({ length: 14 }, () => preso({ ruolo: 'C' }));
    expect(analizza(tanta).segnalazioni.some((s) => s.chiave === 'rigoristi-zero')).toBe(true);
  });

  it('calcola la titolarita media complessiva e per ruolo', () => {
    const rosa = [
      preso({ ruolo: 'A', probTitolare: 90 }),
      preso({ ruolo: 'A', probTitolare: 70 }),
      preso({ ruolo: 'D', probTitolare: 50 }),
    ];
    const a = analizza(rosa);
    expect(a.titolaritaMedia).toBe(70);
    expect(a.titolaritaPerRuolo.A).toBe(80);
    expect(a.titolaritaPerRuolo.C).toBeNull();
  });

  it('segnala lo sforo di quota per ruolo', () => {
    const rosa = [preso({ ruolo: 'P', prezzoPagato: 60 })]; // quota P = 25
    const a = analizza(rosa);
    expect(a.segnalazioni.some((s) => s.chiave === 'quota-P' && s.testo.includes('35'))).toBe(true);
  });

  it('conta gli slot scoperti e il credito medio disponibile', () => {
    const rosa = [preso({ ruolo: 'A', prezzoPagato: 100 })];
    const a = analizza(rosa);
    expect(a.slotScoperti).toEqual({ P: 3, D: 8, C: 8, A: 5 });
    expect(a.creditoMedioPerSlot).toBe(Math.floor(400 / 24));
  });

  it('con rosa vuota non inventa segnalazioni', () => {
    const a = analizza([calc({ ruolo: 'A' })]);
    expect(a.rosa).toHaveLength(0);
    expect(a.titolaritaMedia).toBeNull();
    expect(a.quanteAttenzioni).toBe(0);
  });

  it('formula tutto come constatazione, senza imperativi', () => {
    const rosa = Array.from({ length: 5 }, () => preso({ ruolo: 'C', squadra: 'Napoli' }));
    for (const s of analizza(rosa).segnalazioni) {
      expect(s.testo).not.toMatch(/devi|dovresti|compra|evita|sbagli/i);
    }
  });
});
