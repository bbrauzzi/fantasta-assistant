import { describe, expect, it } from 'vitest';
import {
  applicaDiff,
  calcolaDiff,
  chiaveDifferenza,
  etichettaFreschezza,
  fasciaDaQuotazione,
  fileSembraParziale,
  giorniDaAggiornamento,
  haIntestazioni,
  interpretaRighe,
  leggiBooleano,
  leggiFascia,
  leggiNumero,
  leggiRuolo,
  mappaturaCompleta,
  proponiMappatura,
  trovaRigaIntestazioni,
} from './listone';
import { calc } from './aiuti-test';
import type { RigaGrezza } from '../types';

const riga = (numeroRiga: number, ...celle: string[]): RigaGrezza => ({ numeroRiga, celle });

describe('lettura dei valori grezzi', () => {
  it('riconosce le sigle di ruolo piu comuni', () => {
    expect(leggiRuolo('P')).toBe('P');
    expect(leggiRuolo('Por')).toBe('P');
    expect(leggiRuolo('difensore')).toBe('D');
    expect(leggiRuolo('C')).toBe('C');
    expect(leggiRuolo('Att')).toBe('A');
    expect(leggiRuolo('')).toBeNull();
    expect(leggiRuolo('???')).toBeNull();
  });

  it('legge i numeri con virgola decimale e simboli di troppo', () => {
    expect(leggiNumero('12')).toBe(12);
    expect(leggiNumero('12,5')).toBe(12.5);
    expect(leggiNumero(' 30 cr ')).toBe(30);
    expect(leggiNumero('')).toBeNull();
    expect(leggiNumero('-')).toBeNull();
    expect(leggiNumero('abc')).toBeNull();
  });

  it('legge i booleani nelle forme che compaiono nei file italiani', () => {
    expect(leggiBooleano('SI')).toBe(true);
    expect(leggiBooleano('x')).toBe(true);
    expect(leggiBooleano('0')).toBe(false);
    expect(leggiBooleano('boh')).toBeNull();
  });

  it('riconosce le fasce anche scritte a modo loro', () => {
    expect(leggiFascia('top')).toBe('Top');
    expect(leggiFascia('SEMI-TOP')).toBe('Semi-top');
    expect(leggiFascia('terza')).toBe('Terza fascia');
    expect(leggiFascia('scommessa')).toBe('Scommessa');
    expect(leggiFascia('boh')).toBeNull();
  });

  it('deduce la fascia dalla quotazione con soglie diverse per ruolo', () => {
    expect(fasciaDaQuotazione(45, 'A')).toBe('Top');
    expect(fasciaDaQuotazione(20, 'A')).toBe('Semi-top');
    expect(fasciaDaQuotazione(20, 'D')).toBe('Top');
    expect(fasciaDaQuotazione(2, 'C')).toBe('Scommessa');
  });
});

describe('mappatura delle colonne', () => {
  it('propone le colonne piu probabili dalle intestazioni', () => {
    const m = proponiMappatura(['Id', 'R', 'Nome', 'Squadra', 'Qt.A', 'FVM']);
    expect(m.nome).toBe(2);
    expect(m.squadra).toBe(3);
    expect(m.ruolo).toBe(1);
    expect(m.quotazioneBase).toBe(4);
  });

  it('lascia a null i campi che nel file non ci sono', () => {
    const m = proponiMappatura(['Nome', 'Squadra', 'Ruolo', 'Quotazione']);
    expect(m.rigorista).toBeNull();
    expect(m.probTitolare).toBeNull();
  });

  it('riconosce se la prima riga contiene intestazioni', () => {
    expect(haIntestazioni([riga(1, 'Nome', 'Squadra', 'Ruolo', 'Qt.A')])).toBe(true);
    expect(haIntestazioni([riga(1, 'Lautaro', 'Inter', 'A', '45')])).toBe(false);
    expect(haIntestazioni([])).toBe(false);
  });

  it('e completa solo quando i campi obbligatori sono tutti mappati', () => {
    const m = proponiMappatura(['Id', 'R', 'Nome', 'Squadra', 'Qt.A', 'FVM']);
    expect(mappaturaCompleta(m)).toBe(true);

    const incompleta = proponiMappatura(['Nome', 'Squadra', 'Qt.A']); // manca il ruolo
    expect(mappaturaCompleta(incompleta)).toBe(false);
  });

  it('trova le intestazioni anche sotto una riga di titolo, come nel file di fantacalcio.it', () => {
    const righeConTitolo = [
      riga(1, 'Quotazioni Fantacalcio Stagione 2026-27'),
      riga(2, 'Id', 'R', 'RM', 'Nome', 'Squadra', 'Qt.A'),
      riga(3, '5841', 'P', 'Por', 'Svilar', 'Roma', '18'),
    ];
    expect(trovaRigaIntestazioni(righeConTitolo)).toBe(1);

    expect(trovaRigaIntestazioni([riga(1, 'Nome', 'Squadra', 'Ruolo', 'Qt.A')])).toBe(0);
    expect(trovaRigaIntestazioni([riga(1, 'Lautaro', 'Inter', 'A', '45')])).toBe(-1);
  });
});

describe('interpretaRighe: nessuna scrittura se il file e malformato', () => {
  const mappa = { nome: 0, squadra: 1, ruolo: 2, quotazioneBase: 3, fascia: null, rigorista: null, probTitolare: null };

  it('accetta le righe complete', () => {
    const { righe, errori } = interpretaRighe([riga(2, 'Lautaro', 'Inter', 'A', '45')], mappa);
    expect(errori).toHaveLength(0);
    expect(righe[0]).toMatchObject({ nome: 'Lautaro', squadra: 'Inter', ruolo: 'A', quotazioneBase: 45 });
  });

  it('spiega riga per riga cosa non torna', () => {
    const { righe, errori } = interpretaRighe(
      [
        riga(2, '', 'Inter', 'A', '45'),
        riga(3, 'Tizio', '', 'A', '45'),
        riga(4, 'Caio', 'Roma', 'Z', '45'),
        riga(5, 'Sempronio', 'Roma', 'C', 'boh'),
      ],
      mappa,
    );
    expect(righe).toHaveLength(0);
    expect(errori.map((e) => e.numeroRiga)).toEqual([2, 3, 4, 5]);
    expect(errori[0].motivo).toContain('nome');
    expect(errori[2].motivo).toContain('ruolo');
    expect(errori[3].motivo).toContain('quotazione');
  });

  it('salta le righe vuote senza segnalarle come errori', () => {
    const { righe, errori } = interpretaRighe([riga(2, '', '', '', ''), riga(3, 'Tizio', 'Roma', 'C', '9')], mappa);
    expect(righe).toHaveLength(1);
    expect(errori).toHaveLength(0);
  });

  it('segnala i duplicati indicando la riga gia vista', () => {
    const { righe, errori } = interpretaRighe(
      [riga(2, 'Lautaro', 'Inter', 'A', '45'), riga(3, 'Lautaro', 'Inter', 'A', '46')],
      mappa,
    );
    expect(righe).toHaveLength(1);
    expect(errori[0].motivo).toContain('riga 2');
  });

  it('normalizza una titolarita espressa da 0 a 1', () => {
    const { righe } = interpretaRighe([riga(2, 'Tizio', 'Roma', 'C', '9', '0,85')], {
      ...mappa,
      probTitolare: 4,
    });
    expect(righe[0].probTitolare).toBe(85);
  });
});

describe('calcolaDiff (F14)', () => {
  const attuali = [
    calc({ id: '1', nome: 'Lautaro', squadra: 'Inter', ruolo: 'A', quotazioneBase: 45, stato: 'obiettivo' }),
    calc({ id: '2', nome: 'Kean', squadra: 'Fiorentina', ruolo: 'A', quotazioneBase: 26 }),
    calc({ id: '3', nome: 'Zaniolo', squadra: 'Udinese', ruolo: 'C', quotazioneBase: 18 }),
  ];
  const mappa = { nome: 0, squadra: 1, ruolo: 2, quotazioneBase: 3, fascia: null, rigorista: null, probTitolare: null };

  const leggi = (...righe: RigaGrezza[]) => interpretaRighe(righe, mappa).righe;

  it('riconosce un trasferimento dal cambio di squadra a nome uguale', () => {
    const ref = calcolaDiff(attuali, leggi(riga(2, 'Kean', 'Juventus', 'A', '26')));
    expect(ref.trasferimenti).toHaveLength(1);
    expect(ref.trasferimenti[0]).toMatchObject({ nome: 'Kean', squadraPrec: 'Fiorentina', squadra: 'Juventus' });
    expect(ref.nuovi).toHaveLength(0);
  });

  it('classifica come nuovo chi non c era', () => {
    const ref = calcolaDiff(attuali, leggi(riga(2, 'Camarda', 'Lecce', 'A', '7')));
    expect(ref.nuovi.map((d) => d.nome)).toEqual(['Camarda']);
  });

  it('elenca come usciti quelli che nel file non ci sono piu, prima quelli che mi riguardano', () => {
    const ref = calcolaDiff(attuali, leggi(riga(2, 'Kean', 'Fiorentina', 'A', '26')));
    expect(ref.usciti).toHaveLength(2);
    expect(ref.usciti[0].nome).toBe('Lautaro');
    expect(ref.usciti[0].miRiguarda).toBe(true);
  });

  it('ordina le quotazioni cambiate per variazione assoluta decrescente', () => {
    const ref = calcolaDiff(
      attuali,
      leggi(
        riga(2, 'Lautaro', 'Inter', 'A', '48'),
        riga(3, 'Kean', 'Fiorentina', 'A', '10'),
        riga(4, 'Zaniolo', 'Udinese', 'C', '19'),
      ),
    );
    expect(ref.quotazioni.map((d) => d.nome)).toEqual(['Kean', 'Lautaro', 'Zaniolo']);
    expect(ref.quotazioni[0].delta).toBe(-16);
    expect(ref.quotazioni[0].deltaPerc).toBe(-62);
  });

  it('registra i cambi di ruolo', () => {
    const ref = calcolaDiff(attuali, leggi(riga(2, 'Zaniolo', 'Udinese', 'A', '18')));
    expect(ref.cambiRuolo[0]).toMatchObject({ nome: 'Zaniolo', ruoloPrec: 'C', ruolo: 'A' });
  });

  it('conta come invariati quelli identici', () => {
    const ref = calcolaDiff(attuali, leggi(riga(2, 'Lautaro', 'Inter', 'A', '45')));
    expect(ref.invariati).toBe(1);
  });

  it('la ricerca del trasferimento e accent-insensitive', () => {
    const conAccento = [calc({ id: '9', nome: 'Højlund', squadra: 'Napoli', ruolo: 'A', quotazioneBase: 16 })];
    const ref = calcolaDiff(conAccento, leggi(riga(2, 'Hojlund', 'Milan', 'A', '16')));
    expect(ref.trasferimenti).toHaveLength(1);
    expect(ref.nuovi).toHaveLength(0);
  });
});

describe('applicaDiff: il mio lavoro non si tocca', () => {
  const nuovoId = (() => {
    let n = 0;
    return () => `nuovo-${++n}`;
  })();
  const mappa = { nome: 0, squadra: 1, ruolo: 2, quotazioneBase: 3, fascia: null, rigorista: null, probTitolare: null };
  const leggi = (...righe: RigaGrezza[]) => interpretaRighe(righe, mappa).righe;

  it('aggiorna la squadra ma conserva stato, note e prezzo pagato', () => {
    const attuali = [
      calc({
        id: '1',
        nome: 'Kean',
        squadra: 'Fiorentina',
        ruolo: 'A',
        quotazioneBase: 26,
        stato: 'acquistato',
        prezzoPagato: 40,
        note: 'mio pupillo',
        ordineObiettivo: 3,
      }),
    ];
    const ref = calcolaDiff(attuali, leggi(riga(2, 'Kean', 'Juventus', 'A', '30')));
    const esito = applicaDiff(attuali, ref, { nuovoId });
    const kean = esito.calciatori[0];
    expect(kean.squadra).toBe('Juventus');
    expect(kean.quotazioneBase).toBe(30);
    expect(kean.stato).toBe('acquistato');
    expect(kean.prezzoPagato).toBe(40);
    expect(kean.note).toBe('mio pupillo');
    expect(kean.ordineObiettivo).toBe(3);
  });

  it('marca da rivedere chi ha cambiato squadra senza toccarne la titolarita', () => {
    const attuali = [calc({ id: '1', nome: 'Kean', squadra: 'Fiorentina', ruolo: 'A', probTitolare: 85 })];
    const ref = calcolaDiff(attuali, leggi(riga(2, 'Kean', 'Juventus', 'A', '26')));
    const esito = applicaDiff(attuali, ref, { nuovoId });
    expect(esito.calciatori[0].probTitolare).toBe(85);
    expect(esito.calciatori[0].daRivedere).toMatchObject({ motivo: 'trasferimento', visto: false });
    expect(esito.daRivedere).toBe(1);
  });

  it('non sovrascrive i campi che ho modificato a mano', () => {
    const attuali = [
      calc({
        id: '1',
        nome: 'Kean',
        squadra: 'Fiorentina',
        ruolo: 'A',
        quotazioneBase: 26,
        modificatiAMano: ['quotazioneBase', 'squadra'],
      }),
    ];
    const ref = calcolaDiff(attuali, leggi(riga(2, 'Kean', 'Juventus', 'A', '50')));
    const esito = applicaDiff(attuali, ref, { nuovoId });
    expect(esito.calciatori[0].squadra).toBe('Fiorentina');
    expect(esito.calciatori[0].quotazioneBase).toBe(26);
  });

  it('non cancella gli usciti: li marca soltanto', () => {
    const attuali = [calc({ id: '1', nome: 'Tizio', squadra: 'Roma', ruolo: 'C', stato: 'obiettivo' })];
    const ref = calcolaDiff(attuali, leggi(riga(2, 'Caio', 'Roma', 'C', '9')));
    const esito = applicaDiff(attuali, ref, { nuovoId });
    expect(esito.calciatori.find((c) => c.id === '1')!.stato).toBe('obiettivo');
    expect(esito.calciatori.find((c) => c.id === '1')!.daRivedere!.motivo).toBe('uscito');
  });

  it('applica solo le differenze selezionate', () => {
    const attuali = [
      calc({ id: '1', nome: 'Kean', squadra: 'Fiorentina', ruolo: 'A', quotazioneBase: 26 }),
      calc({ id: '2', nome: 'Zaniolo', squadra: 'Udinese', ruolo: 'C', quotazioneBase: 18 }),
    ];
    const ref = calcolaDiff(
      attuali,
      leggi(riga(2, 'Kean', 'Juventus', 'A', '26'), riga(3, 'Zaniolo', 'Roma', 'C', '18')),
    );
    const soloKean = new Set([chiaveDifferenza(ref.trasferimenti.find((d) => d.nome === 'Kean')!)]);
    const esito = applicaDiff(attuali, ref, { nuovoId, selezionate: soloKean });
    expect(esito.calciatori.find((c) => c.id === '1')!.squadra).toBe('Juventus');
    expect(esito.calciatori.find((c) => c.id === '2')!.squadra).toBe('Udinese');
  });

  it('sa non aggiungere i nuovi arrivi se non li voglio', () => {
    const attuali = [calc({ id: '1', nome: 'Kean', squadra: 'Fiorentina', ruolo: 'A', quotazioneBase: 26 })];
    const ref = calcolaDiff(
      attuali,
      leggi(riga(2, 'Kean', 'Fiorentina', 'A', '26'), riga(3, 'Camarda', 'Lecce', 'A', '7')),
    );
    expect(applicaDiff(attuali, ref, { nuovoId, includiNuovi: false }).calciatori).toHaveLength(1);
    expect(applicaDiff(attuali, ref, { nuovoId, includiNuovi: true }).calciatori).toHaveLength(2);
  });
});

describe('freschezza del listone', () => {
  const oggi = new Date('2026-08-21T10:00:00').getTime();
  const giorniFa = (n: number) => oggi - n * 24 * 60 * 60 * 1000;

  it('conta i giorni dall ultimo aggiornamento', () => {
    expect(giorniDaAggiornamento(giorniFa(5), oggi)).toBe(5);
    expect(giorniDaAggiornamento(null)).toBeNull();
  });

  it('marca l indicazione oltre i tre giorni', () => {
    expect(etichettaFreschezza(2)).toEqual({ testo: 'listone di 2 giorni fa', marcato: false });
    expect(etichettaFreschezza(4).marcato).toBe(true);
    expect(etichettaFreschezza(null).marcato).toBe(true);
    expect(etichettaFreschezza(0).testo).toBe('listone aggiornato oggi');
  });
});

describe('file parziale (F14)', () => {
  const mappa = { nome: 0, squadra: 1, ruolo: 2, quotazioneBase: 3, fascia: null, rigorista: null, probTitolare: null };
  const listone = Array.from({ length: 100 }, (_, i) =>
    calc({ id: `x${i}`, nome: `Gioc${i}`, squadra: 'Roma', ruolo: 'C', quotazioneBase: 5 }),
  );

  it('riconosce un estratto: quasi tutti risulterebbero usciti', () => {
    const righe = interpretaRighe(
      [{ numeroRiga: 2, celle: ['Gioc0', 'Roma', 'C', '6'] }],
      mappa,
    ).righe;
    const ref = calcolaDiff(listone, righe);
    expect(ref.usciti).toHaveLength(99);
    expect(fileSembraParziale(ref, listone.length)).toBe(true);
  });

  it('non allarma su un file completo con qualche uscita fisiologica', () => {
    const righe = interpretaRighe(
      listone.slice(0, 95).map((c, i) => ({ numeroRiga: i + 2, celle: [c.nome, c.squadra, c.ruolo, '5'] })),
      mappa,
    ).righe;
    const ref = calcolaDiff(listone, righe);
    expect(ref.usciti).toHaveLength(5);
    expect(fileSembraParziale(ref, listone.length)).toBe(false);
  });

  it('su listone vuoto non ha senso parlare di file parziale', () => {
    expect(fileSembraParziale(calcolaDiff([], []), 0)).toBe(false);
  });
});
