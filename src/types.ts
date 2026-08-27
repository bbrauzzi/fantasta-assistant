/* ============================================================
   Tipi del dominio. Tutto lo stato dell'asta passa da qui.
   ============================================================ */

export type Ruolo = 'P' | 'D' | 'C' | 'A';

export type Fascia = 'Top' | 'Semi-top' | 'Terza fascia' | 'Scommessa';

/** Stato di un calciatore rispetto alla MIA asta. */
export type StatoCalciatore =
  | 'disponibile' // ancora sul mercato, non l'ho marcato in alcun modo
  | 'obiettivo' // lo voglio
  | 'acquistato' // l'ho preso io
  | 'perso' // se l'e' aggiudicato un avversario
  | 'scartato'; // non mi interessa, toglilo dai suggerimenti

export interface Calciatore {
  id: string;
  nome: string;
  squadra: string; // squadra di Serie A
  ruolo: Ruolo;
  fascia: Fascia;
  /** Prima scelta dal dischetto secondo le fonti. */
  rigorista: boolean;
  /** Le fonti non concordano su chi tira: gerarchia da confermare in campo. */
  rigoristaIncerto: boolean;
  /** Batte le punizioni: piu' occasioni di bonus e di assist. */
  tiratorePunizioni: boolean;
  probTitolare: number; // 0-100
  quotazioneBase: number; // quotazione di listino, su scala 500 crediti / 8 partecipanti
  stato: StatoCalciatore;
  prezzoPagato: number | null; // valorizzato se stato === 'acquistato'
  prezzoDiMercato: number | null; // a quanto l'ha preso l'avversario, se stato === 'perso'
  acquirenteId: string | null; // quale avversario l'ha preso, se noto
  note: string; // annotazioni libere mie

  /** Ordine dentro la lista obiettivi del suo ruolo (drag-and-drop). */
  ordineObiettivo: number;
  /** Dopo un aggiornamento del listone: il dato va ricontrollato da me. */
  daRivedere: DaRivedere | null;
  /** Campi che ho modificato a mano: l'import non deve sovrascriverli. */
  modificatiAMano: CampoModificabile[];
}

export type CampoModificabile =
  | 'fascia'
  | 'probTitolare'
  | 'quotazioneBase'
  | 'ruolo'
  | 'squadra'
  | 'rigorista'
  | 'tiratorePunizioni';

export interface DaRivedere {
  motivo: 'trasferimento' | 'quotazione' | 'ruolo' | 'uscito';
  dettaglio: string; // es. "Milan -> Napoli"
  quando: number; // timestamp
  visto: boolean;
}

export interface Avversario {
  id: string;
  nome: string;
  budgetIniziale: number; // di norma uguale al mio
  /** Fallback: se non traccio giocatore per giocatore, sommo qui. */
  speseManuali: number;
  /** Quanti acquisti ho contato "alla svelta" senza associarli a un calciatore. */
  slotManuali: number;
}

export interface ConfigLega {
  /** Come si chiama la lega. Compare in testata e nel nome dei backup. */
  nomeLega: string;
  /** La mia squadra: non e' un avversario, e' quella di cui vedo la rosa. */
  nomeMiaSquadra: string;
  budgetTotale: number; // default 300
  numPartecipanti: number; // default 10
  slotPerRuolo: Record<Ruolo, number>; // default { P:3, D:8, C:8, A:6 }
  percBudgetPerRuolo: Record<Ruolo, number>; // default { P:5, D:15, C:30, A:50 }
  prezzoMinimoSlot: number; // default 1 - quanto costa come minimo riempire uno slot
  /** Da quanti calciatori della stessa squadra scatta la segnalazione. */
  sogliaConcentrazioneSquadra: number; // default 4
  /** Link esterno alle probabili formazioni, configurabile se cambia. */
  linkFormazioniProbabili: string;
}

export type TipoEvento =
  | 'acquisto'
  | 'perdita'
  | 'scarto'
  | 'obiettivo'
  | 'rimpiazzo'
  | 'config'
  | 'listone'
  | 'sistema';

export interface EventoRegistro {
  id: string;
  quando: number; // timestamp
  tipo: TipoEvento;
  testo: string;
  /** true per le promozioni automatiche: vanno evidenziate in oro. */
  automatico: boolean;
}

export interface Snapshot {
  id: string;
  quando: number;
  etichetta: string;
  stato: StatoPersistito;
}

/** La fetta di stato che viene salvata, annullata e ripristinata. */
export interface StatoPersistito {
  config: ConfigLega;
  calciatori: Calciatore[];
  avversari: Avversario[];
  registroEventi: EventoRegistro[];
  ultimoAggiornamentoListone: number | null;
  storicoAggiornamenti: VoceStoricoListone[];
}

export interface VoceStoricoListone {
  quando: number;
  nomeFile: string;
  trasferimenti: number;
  nuovi: number;
  usciti: number;
  quotazioniCambiate: number;
  cambiRuolo: number;
}

/* ------------------------- Import / aggiornamento ------------------------- */

/** Campi dell'app a cui si possono mappare le colonne di un file. */
export type CampoImport =
  | 'nome'
  | 'squadra'
  | 'ruolo'
  | 'quotazioneBase'
  | 'fascia'
  | 'rigorista'
  | 'tiratorePunizioni'
  | 'probTitolare';

export interface MappaturaColonne {
  /** campo dell'app -> indice della colonna nel file (null = non mappato) */
  [campo: string]: number | null;
}

export interface RigaGrezza {
  numeroRiga: number; // 1-based, come la vede l'utente nel foglio
  celle: string[];
}

export interface RigaImportata {
  numeroRiga: number;
  nome: string;
  squadra: string;
  ruolo: Ruolo;
  quotazioneBase: number;
  fascia: Fascia | null;
  rigorista: boolean | null;
  tiratorePunizioni: boolean | null;
  probTitolare: number | null;
}

export interface ErroreRiga {
  numeroRiga: number;
  motivo: string;
  contenuto: string;
}

export type TipoDifferenza =
  | 'nuovo'
  | 'trasferimento'
  | 'quotazione'
  | 'ruolo'
  | 'uscito'
  | 'invariato';

export interface Differenza {
  tipo: TipoDifferenza;
  /** id del calciatore gia' presente, null se e' un nuovo arrivo */
  idEsistente: string | null;
  nome: string;
  squadra: string;
  ruolo: Ruolo;
  quotazioneBase: number;
  /** valori precedenti, per mostrare "da -> a" */
  squadraPrec?: string;
  ruoloPrec?: Ruolo;
  quotazionePrec?: number;
  delta?: number;
  deltaPerc?: number;
  /** il calciatore e' fra i miei obiettivi o gia' in rosa: il conflitto conta di piu' */
  miRiguarda: boolean;
  riga?: RigaImportata;
}

export interface RefertoDiff {
  trasferimenti: Differenza[];
  nuovi: Differenza[];
  usciti: Differenza[];
  quotazioni: Differenza[];
  cambiRuolo: Differenza[];
  invariati: number;
  errori: ErroreRiga[];
  righeLette: number;
}
