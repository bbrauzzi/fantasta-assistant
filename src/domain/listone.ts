/* ============================================================
   F1  - import del listone (CSV / XLSX) con mappatura colonne
   F14 - aggiornamento del listone con referto delle differenze
   Qui dentro non si tocca nulla del mio lavoro: stato, note,
   prezzo pagato e ordine degli obiettivi restano miei.
   ============================================================ */

import type {
  Calciatore,
  CampoImport,
  Differenza,
  ErroreRiga,
  Fascia,
  MappaturaColonne,
  RefertoDiff,
  RigaGrezza,
  RigaImportata,
  Ruolo,
} from '../types';
import { FASCE, RANGO_FASCIA } from './costanti';
import { chiaveCalciatore, chiaveNome, normalizza } from './testo';

/* --------------------- riconoscimento delle colonne --------------------- */

/**
 * Il tracciato del file cambia ogni anno, quindi non si assume niente:
 * queste sono solo proposte, l'utente conferma o corregge nella schermata
 * di mappatura.
 */
const INDIZI: Record<CampoImport, string[]> = {
  nome: ['nome', 'cognome', 'giocatore', 'calciatore', 'player'],
  squadra: ['squadra', 'team', 'club'],
  ruolo: ['ruolo', 'r', 'rm', 'pos', 'posizione'],
  quotazioneBase: ['qt.a', 'qta', 'quotazione', 'quot', 'qt', 'prezzo', 'valore', 'fvm'],
  fascia: ['fascia', 'categoria'],
  rigorista: ['rigorista', 'rig', 'rigori'],
  tiratorePunizioni: ['punizioni', 'punizione', 'pun', 'piazzati', 'calcipiazzati'],
  probTitolare: ['titolare', 'titolarita', 'probabilita', 'prob', 'tit'],
};

export const CAMPI_IMPORT: CampoImport[] = [
  'nome',
  'squadra',
  'ruolo',
  'quotazioneBase',
  'fascia',
  'rigorista',
  'tiratorePunizioni',
  'probTitolare',
];

export const CAMPO_OBBLIGATORIO: Record<CampoImport, boolean> = {
  nome: true,
  squadra: true,
  ruolo: true,
  quotazioneBase: true,
  fascia: false,
  rigorista: false,
  tiratorePunizioni: false,
  probTitolare: false,
};

export const ETICHETTA_CAMPO: Record<CampoImport, string> = {
  nome: 'Nome',
  squadra: 'Squadra',
  ruolo: 'Ruolo',
  quotazioneBase: 'Quotazione',
  fascia: 'Fascia',
  rigorista: 'Rigorista',
  tiratorePunizioni: 'Punizioni',
  probTitolare: '% titolarità',
};

export function proponiMappatura(intestazioni: string[]): MappaturaColonne {
  const teste = intestazioni.map((h) => normalizza(h).replace(/[^a-z0-9.]/g, ''));
  const mappa: MappaturaColonne = {};
  const usate = new Set<number>();

  for (const campo of CAMPI_IMPORT) {
    const indizi = INDIZI[campo];
    // prima il match esatto, poi quello parziale: "R" non deve rubare "Ruolo"
    let idx = teste.findIndex((h, i) => !usate.has(i) && indizi.includes(h));
    if (idx < 0) {
      idx = teste.findIndex(
        (h, i) => !usate.has(i) && h.length > 1 && indizi.some((k) => k.length > 1 && h.includes(k)),
      );
    }
    mappa[campo] = idx >= 0 ? idx : null;
    if (idx >= 0) usate.add(idx);
  }
  return mappa;
}

/**
 * Le intestazioni ci sono se almeno una cella della prima riga somiglia a un
 * campo noto e la riga non contiene un numero dove ci si aspetta la quotazione.
 */
export function haIntestazioni(righe: RigaGrezza[]): boolean {
  const prima = righe[0];
  if (!prima) return false;
  const tutti = Object.values(INDIZI).flat();
  return prima.celle.some((c) => {
    const n = normalizza(c).replace(/[^a-z0-9.]/g, '');
    return n.length > 0 && tutti.includes(n);
  });
}

/* ---------------------------- interpretazione ---------------------------- */

const RUOLI_VALIDI: Record<string, Ruolo> = {
  p: 'P',
  por: 'P',
  portiere: 'P',
  gk: 'P',
  d: 'D',
  dif: 'D',
  difensore: 'D',
  df: 'D',
  c: 'C',
  cen: 'C',
  centrocampista: 'C',
  mf: 'C',
  m: 'C',
  a: 'A',
  att: 'A',
  attaccante: 'A',
  fw: 'A',
  pc: 'A',
  t: 'A', // trequartista nel Mantra: in Classic pesa come attaccante
  w: 'A',
};

export function leggiRuolo(v: string): Ruolo | null {
  const n = normalizza(v).replace(/[^a-z]/g, '');
  if (!n) return null;
  return RUOLI_VALIDI[n] ?? RUOLI_VALIDI[n[0]] ?? null;
}

export function leggiNumero(v: string): number | null {
  if (v === undefined || v === null) return null;
  const pulito = String(v).replace(/[^0-9,.-]/g, '').replace(',', '.');
  if (pulito === '' || pulito === '-' || pulito === '.') return null;
  const n = Number(pulito);
  return Number.isFinite(n) ? n : null;
}

export function leggiBooleano(v: string): boolean | null {
  const n = normalizza(v);
  if (!n) return null;
  if (['1', 'si', 'sì', 'x', 'true', 'vero', 'y', 'yes', 'rig'].includes(n)) return true;
  if (['0', 'no', 'false', 'falso', 'n', '-'].includes(n)) return false;
  return null;
}

export function leggiFascia(v: string): Fascia | null {
  const n = normalizza(v);
  if (!n) return null;
  const trovata = FASCE.find((f) => normalizza(f) === n);
  if (trovata) return trovata;
  if (n.startsWith('top')) return 'Top';
  if (n.startsWith('semi')) return 'Semi-top';
  if (n.startsWith('terza') || n === '3') return 'Terza fascia';
  if (n.startsWith('scomm')) return 'Scommessa';
  return null;
}

/**
 * Fascia dedotta dalla quotazione, quando il file non ce l'ha (quasi sempre).
 * Le soglie sono tarate sulla distribuzione reale del listino 2026/27
 * (Qt.A massime: P 18, D 32, C 30, A 35) perche' ogni ruolo ha una scala sua:
 * un difensore da 16 e' un top, un attaccante da 16 e' terza fascia.
 * Sono un punto di partenza modificabile a mano, non una verita'.
 */
export function fasciaDaQuotazione(q: number, ruolo: Ruolo): Fascia {
  const soglie: Record<Ruolo, [number, number, number]> = {
    P: [14, 9, 5],
    D: [16, 10, 5],
    C: [22, 13, 7],
    A: [25, 15, 8],
  };
  const [top, semi, terza] = soglie[ruolo];
  if (q >= top) return 'Top';
  if (q >= semi) return 'Semi-top';
  if (q >= terza) return 'Terza fascia';
  return 'Scommessa';
}

export interface EsitoInterpretazione {
  righe: RigaImportata[];
  errori: ErroreRiga[];
}

/**
 * Trasforma le righe grezze in righe tipizzate. Ogni riga che non torna
 * finisce negli errori con il motivo e il contenuto originale: se il file
 * e' malformato non si scrive niente, si spiega cosa non va riga per riga.
 */
export function interpretaRighe(
  righe: RigaGrezza[],
  mappa: MappaturaColonne,
): EsitoInterpretazione {
  const out: RigaImportata[] = [];
  const errori: ErroreRiga[] = [];
  const visti = new Map<string, number>();

  const cella = (r: RigaGrezza, campo: CampoImport): string => {
    const i = mappa[campo];
    if (i === null || i === undefined) return '';
    return (r.celle[i] ?? '').toString().trim();
  };

  for (const r of righe) {
    const contenuto = r.celle.join(' | ');
    if (r.celle.every((c) => !c || !c.trim())) continue; // riga vuota: si salta in silenzio

    const nome = cella(r, 'nome');
    const squadra = cella(r, 'squadra');
    const ruolo = leggiRuolo(cella(r, 'ruolo'));
    const quotazione = leggiNumero(cella(r, 'quotazioneBase'));

    if (!nome) {
      errori.push({ numeroRiga: r.numeroRiga, motivo: 'nome mancante', contenuto });
      continue;
    }
    if (!squadra) {
      errori.push({ numeroRiga: r.numeroRiga, motivo: 'squadra mancante', contenuto });
      continue;
    }
    if (!ruolo) {
      errori.push({
        numeroRiga: r.numeroRiga,
        motivo: `ruolo non riconosciuto ("${cella(r, 'ruolo')}")`,
        contenuto,
      });
      continue;
    }
    if (quotazione === null || quotazione < 0) {
      errori.push({
        numeroRiga: r.numeroRiga,
        motivo: `quotazione non valida ("${cella(r, 'quotazioneBase')}")`,
        contenuto,
      });
      continue;
    }

    const chiave = chiaveCalciatore(nome, squadra);
    const gia = visti.get(chiave);
    if (gia !== undefined) {
      errori.push({
        numeroRiga: r.numeroRiga,
        motivo: `duplicato: già presente alla riga ${gia}`,
        contenuto,
      });
      continue;
    }
    visti.set(chiave, r.numeroRiga);

    const prob = leggiNumero(cella(r, 'probTitolare'));
    out.push({
      numeroRiga: r.numeroRiga,
      nome,
      squadra,
      ruolo,
      quotazioneBase: Math.round(quotazione),
      fascia: leggiFascia(cella(r, 'fascia')),
      rigorista: leggiBooleano(cella(r, 'rigorista')),
      tiratorePunizioni: leggiBooleano(cella(r, 'tiratorePunizioni')),
      // alcuni file usano 0-1 invece di 0-100
      probTitolare: prob === null ? null : Math.round(prob <= 1 ? prob * 100 : prob),
    });
  }

  return { righe: out, errori };
}

/* ------------------------------ il referto ------------------------------ */

/** Sopra questa variazione la quotazione e' cambiata "in modo significativo". */
export const SOGLIA_VARIAZIONE_RILEVANTE = 0.2;

function miRiguarda(c: Calciatore): boolean {
  return c.stato === 'obiettivo' || c.stato === 'acquistato';
}

/**
 * Confronta il file con il listone attuale.
 * Il match primario e' nome+squadra; se non trova nulla, riprova sul solo
 * nome: e' cosi' che si riconoscono i trasferimenti, che sono l'informazione
 * per cui sto aggiornando a pochi giorni dall'asta.
 */
export function calcolaDiff(
  attuali: Calciatore[],
  righe: RigaImportata[],
  errori: ErroreRiga[] = [],
): RefertoDiff {
  const perChiaveCompleta = new Map(attuali.map((c) => [chiaveCalciatore(c.nome, c.squadra), c]));
  const perNome = new Map<string, Calciatore[]>();
  for (const c of attuali) {
    const k = chiaveNome(c.nome);
    const lista = perNome.get(k);
    if (lista) lista.push(c);
    else perNome.set(k, [c]);
  }

  const trasferimenti: Differenza[] = [];
  const nuovi: Differenza[] = [];
  const quotazioni: Differenza[] = [];
  const cambiRuolo: Differenza[] = [];
  let invariati = 0;
  const abbinati = new Set<string>();

  for (const r of righe) {
    const esatto = perChiaveCompleta.get(chiaveCalciatore(r.nome, r.squadra));
    // se il nome e' unico nel listone, un cambio di squadra e' un trasferimento;
    // se e' ambiguo (due omonimi) meglio trattarlo come nuovo arrivo
    const omonimi = perNome.get(chiaveNome(r.nome)) ?? [];
    const perTrasferimento = !esatto && omonimi.length === 1 ? omonimi[0] : null;
    const esistente = esatto ?? perTrasferimento;

    if (!esistente) {
      nuovi.push({
        tipo: 'nuovo',
        idEsistente: null,
        nome: r.nome,
        squadra: r.squadra,
        ruolo: r.ruolo,
        quotazioneBase: r.quotazioneBase,
        miRiguarda: false,
        riga: r,
      });
      continue;
    }

    abbinati.add(esistente.id);
    const base: Omit<Differenza, 'tipo'> = {
      idEsistente: esistente.id,
      nome: r.nome,
      squadra: r.squadra,
      ruolo: r.ruolo,
      quotazioneBase: r.quotazioneBase,
      miRiguarda: miRiguarda(esistente),
      riga: r,
    };

    let toccato = false;

    if (normalizza(esistente.squadra) !== normalizza(r.squadra)) {
      trasferimenti.push({ ...base, tipo: 'trasferimento', squadraPrec: esistente.squadra });
      toccato = true;
    }
    if (esistente.ruolo !== r.ruolo) {
      cambiRuolo.push({ ...base, tipo: 'ruolo', ruoloPrec: esistente.ruolo });
      toccato = true;
    }
    if (esistente.quotazioneBase !== r.quotazioneBase) {
      const delta = r.quotazioneBase - esistente.quotazioneBase;
      quotazioni.push({
        ...base,
        tipo: 'quotazione',
        quotazionePrec: esistente.quotazioneBase,
        delta,
        deltaPerc:
          esistente.quotazioneBase > 0 ? Math.round((delta / esistente.quotazioneBase) * 100) : 100,
      });
      toccato = true;
    }
    if (!toccato) invariati += 1;
  }

  quotazioni.sort((a, b) => Math.abs(b.delta ?? 0) - Math.abs(a.delta ?? 0));

  /* Usciti: c'erano e nel file nuovo non ci sono piu' (venduti all'estero,
     svincolati). Se un mio obiettivo e' fra questi, l'avviso deve essere
     impossibile da ignorare. */
  const usciti: Differenza[] = attuali
    .filter((c) => !abbinati.has(c.id))
    .map((c) => ({
      tipo: 'uscito' as const,
      idEsistente: c.id,
      nome: c.nome,
      squadra: c.squadra,
      ruolo: c.ruolo,
      quotazioneBase: c.quotazioneBase,
      miRiguarda: miRiguarda(c),
    }))
    .sort((a, b) => Number(b.miRiguarda) - Number(a.miRiguarda) || b.quotazioneBase - a.quotazioneBase);

  return {
    trasferimenti: trasferimenti.sort((a, b) => Number(b.miRiguarda) - Number(a.miRiguarda)),
    nuovi: nuovi.sort((a, b) => b.quotazioneBase - a.quotazioneBase),
    usciti,
    quotazioni,
    cambiRuolo,
    invariati,
    errori,
    righeLette: righe.length,
  };
}

export function chiaveDifferenza(d: Differenza): string {
  return `${d.tipo}:${d.idEsistente ?? `nuovo-${chiaveCalciatore(d.nome, d.squadra)}`}`;
}

/**
 * Quota di listone che il file NON contiene. Se e' alta, quasi sicuramente il
 * file e' parziale (un estratto, un foglio filtrato, la colonna sbagliata) e
 * non e' che mezzo campionato si e' svincolato: in quel caso marcare tutti
 * come "usciti" sarebbe rumore, non informazione.
 */
export const SOGLIA_FILE_PARZIALE = 0.3;

export function fileSembraParziale(ref: RefertoDiff, quantiInListone: number): boolean {
  if (quantiInListone === 0) return false;
  return ref.usciti.length / quantiInListone > SOGLIA_FILE_PARZIALE;
}

export function totaleDifferenze(ref: RefertoDiff): number {
  return (
    ref.trasferimenti.length +
    ref.nuovi.length +
    ref.usciti.length +
    ref.quotazioni.length +
    ref.cambiRuolo.length
  );
}

/* ---------------------------- applicazione ---------------------------- */

export interface OpzioniApplica {
  /** chiavi delle differenze selezionate; se assente si applica tutto */
  selezionate?: Set<string>;
  /** true: i nuovi arrivi entrano nel listone */
  includiNuovi?: boolean;
  /** gli usciti non vengono cancellati, solo marcati: potrei averli in rosa */
  quando?: number;
  nuovoId: () => string;
}

export interface EsitoApplica {
  calciatori: Calciatore[];
  applicate: number;
  daRivedere: number;
}

/**
 * Applica il referto preservando sempre il mio lavoro:
 * stato, note, prezzo pagato, ordine negli obiettivi e i campi che ho
 * modificato a mano non vengono toccati. L'aggiornamento riguarda i dati
 * anagrafici e di listino, mai le mie decisioni.
 */
export function applicaDiff(
  attuali: Calciatore[],
  referto: RefertoDiff,
  opt: OpzioniApplica,
): EsitoApplica {
  const quando = opt.quando ?? Date.now();
  const attiva = (d: Differenza) => !opt.selezionate || opt.selezionate.has(chiaveDifferenza(d));

  const patch = new Map<string, Partial<Calciatore>>();
  const segnalazioni = new Map<string, Calciatore['daRivedere']>();
  let applicate = 0;

  const aggiungi = (id: string, p: Partial<Calciatore>) => {
    patch.set(id, { ...(patch.get(id) ?? {}), ...p });
  };

  for (const d of referto.trasferimenti) {
    if (!d.idEsistente || !attiva(d)) continue;
    const orig = attuali.find((c) => c.id === d.idEsistente);
    if (orig?.modificatiAMano.includes('squadra')) continue;
    aggiungi(d.idEsistente, { squadra: d.squadra });
    /* Cambiando squadra la probabilita' di titolarita' che avevo inserito e'
       probabilmente sbagliata, ma l'app non ha modo di sapere quella giusta:
       marco il campo come da rivedere e lascio il numero a me. */
    segnalazioni.set(d.idEsistente, {
      motivo: 'trasferimento',
      dettaglio: `${d.squadraPrec} → ${d.squadra}`,
      quando,
      visto: false,
    });
    applicate += 1;
  }

  for (const d of referto.cambiRuolo) {
    if (!d.idEsistente || !attiva(d)) continue;
    const orig = attuali.find((c) => c.id === d.idEsistente);
    if (orig?.modificatiAMano.includes('ruolo')) continue;
    aggiungi(d.idEsistente, { ruolo: d.ruolo });
    if (!segnalazioni.has(d.idEsistente)) {
      segnalazioni.set(d.idEsistente, {
        motivo: 'ruolo',
        dettaglio: `${d.ruoloPrec} → ${d.ruolo}`,
        quando,
        visto: false,
      });
    }
    applicate += 1;
  }

  for (const d of referto.quotazioni) {
    if (!d.idEsistente || !attiva(d)) continue;
    const orig = attuali.find((c) => c.id === d.idEsistente);
    if (orig?.modificatiAMano.includes('quotazioneBase')) continue;
    aggiungi(d.idEsistente, { quotazioneBase: d.quotazioneBase });
    const rilevante =
      Math.abs(d.deltaPerc ?? 0) >= SOGLIA_VARIAZIONE_RILEVANTE * 100 && d.miRiguarda;
    if (rilevante && !segnalazioni.has(d.idEsistente)) {
      segnalazioni.set(d.idEsistente, {
        motivo: 'quotazione',
        dettaglio: `${d.quotazionePrec} → ${d.quotazioneBase} (${(d.delta ?? 0) > 0 ? '+' : ''}${d.deltaPerc}%)`,
        quando,
        visto: false,
      });
    }
    applicate += 1;
  }

  for (const d of referto.usciti) {
    if (!d.idEsistente || !attiva(d)) continue;
    // non si cancella: potrei averlo gia' in rosa o fra gli obiettivi
    segnalazioni.set(d.idEsistente, {
      motivo: 'uscito',
      dettaglio: 'non è più nel listone ufficiale',
      quando,
      visto: false,
    });
    applicate += 1;
  }

  let calciatori = attuali.map((c) => {
    const p = patch.get(c.id);
    const seg = segnalazioni.get(c.id);
    if (!p && !seg) return c;
    return { ...c, ...(p ?? {}), daRivedere: seg ?? c.daRivedere };
  });

  if (opt.includiNuovi !== false) {
    const daAggiungere = referto.nuovi.filter(attiva);
    for (const d of daAggiungere) {
      const r = d.riga!;
      calciatori.push(creaCalciatore(r, opt.nuovoId()));
      applicate += 1;
    }
  }

  return {
    calciatori,
    applicate,
    daRivedere: calciatori.filter((c) => c.daRivedere && !c.daRivedere.visto).length,
  };
}

/**
 * Campi che l'import NON tocca mai su un calciatore che ho gia' in listone.
 * Rigoristi e tiratori di punizioni non stanno nel listino ufficiale: li ho
 * messi io a mano o li ha portati il seed, e un file di quotazioni che non
 * contiene quelle colonne non ha alcun motivo di azzerarli.
 */
export function creaCalciatore(r: RigaImportata, id: string): Calciatore {
  return {
    id,
    nome: r.nome,
    squadra: r.squadra,
    ruolo: r.ruolo,
    fascia: r.fascia ?? fasciaDaQuotazione(r.quotazioneBase, r.ruolo),
    rigorista: r.rigorista ?? false,
    rigoristaIncerto: false,
    tiratorePunizioni: r.tiratorePunizioni ?? false,
    probTitolare: r.probTitolare ?? 70,
    quotazioneBase: r.quotazioneBase,
    stato: 'disponibile',
    prezzoPagato: null,
    prezzoDiMercato: null,
    acquirenteId: null,
    note: '',
    ordineObiettivo: 0,
    daRivedere: null,
    modificatiAMano: [],
  };
}

/** Ordinamento delle segnalazioni "obiettivi da rivedere": gli usciti in cima. */
export function ordinaDaRivedere(a: Calciatore, b: Calciatore): number {
  const peso = (c: Calciatore) => {
    switch (c.daRivedere?.motivo) {
      case 'uscito':
        return 0;
      case 'trasferimento':
        return 1;
      case 'ruolo':
        return 2;
      default:
        return 3;
    }
  };
  return peso(a) - peso(b) || RANGO_FASCIA[a.fascia] - RANGO_FASCIA[b.fascia];
}

/** Da quanti giorni il listone non viene aggiornato. */
export function giorniDaAggiornamento(ultimo: number | null, adesso = Date.now()): number | null {
  if (!ultimo) return null;
  return Math.floor((adesso - ultimo) / (1000 * 60 * 60 * 24));
}

export function etichettaFreschezza(giorni: number | null): { testo: string; marcato: boolean } {
  if (giorni === null) return { testo: 'listone mai aggiornato', marcato: true };
  if (giorni === 0) return { testo: 'listone aggiornato oggi', marcato: false };
  if (giorni === 1) return { testo: 'listone di ieri', marcato: false };
  return { testo: `listone di ${giorni} giorni fa`, marcato: giorni > 3 };
}
