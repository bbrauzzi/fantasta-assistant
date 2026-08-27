/* ============================================================
   Store unico, persistito su localStorage.
   Ogni azione che modifica lo stato passa da `muta`, che si
   occupa di undo, registro e salvataggio: cosi' non esiste
   un'azione non annullabile.
   ============================================================ */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  Calciatore,
  CampoModificabile,
  ConfigLega,
  EventoRegistro,
  RefertoDiff,
  Ruolo,
  Snapshot,
  StatoPersistito,
  TipoEvento,
  VoceStoricoListone,
} from '../types';
import { CONFIG_DEFAULT, RUOLI } from '../domain/costanti';
import { creaListoneSeed } from '../data/listone-seed';
import { autoRimpiazza, generaObiettivi, riordinaObiettivi } from '../domain/obiettivi';
import { generaAvversari } from '../domain/avversari';
import { applicaDiff, type OpzioniApplica } from '../domain/listone';

const MAX_UNDO = 60; // la specifica chiede almeno 50 azioni
const MAX_SNAPSHOT = 20;
const MAX_EVENTI = 500;

let contatoreId = 0;
export function nuovoId(prefisso = 'c'): string {
  contatoreId += 1;
  return `${prefisso}-${Date.now().toString(36)}-${contatoreId.toString(36)}`;
}

function statoIniziale(): StatoPersistito {
  return {
    config: CONFIG_DEFAULT,
    calciatori: creaListoneSeed(),
    avversari: generaAvversari(CONFIG_DEFAULT),
    registroEventi: [],
    ultimoAggiornamentoListone: null,
    storicoAggiornamenti: [],
  };
}

export interface StoreFantasta extends StatoPersistito {
  /* --- stato volatile, non persistito --- */
  pilaUndo: StatoPersistito[];
  pilaRedo: StatoPersistito[];
  snapshot: Snapshot[];
  ultimoSalvataggio: number | null;
  /** id della riga da far lampeggiare dopo un auto-rimpiazzo */
  idLampeggio: string | null;

  /* --- azioni --- */
  acquista: (id: string, prezzo: number) => void;
  annullaAcquisto: (id: string) => void;
  segnaPerso: (id: string, avversarioId: string | null, prezzo: number | null) => void;
  scarta: (id: string) => void;
  ripristinaDisponibile: (id: string) => void;
  alternaObiettivo: (id: string) => void;
  generaObiettiviMancanti: () => void;
  spostaObiettivo: (ruolo: Ruolo, id: string, indice: number) => void;

  modificaCalciatore: (
    id: string,
    patch: Partial<Calciatore>,
    campi?: CampoModificabile[],
  ) => void;
  aggiungiCalciatore: (c: Omit<Calciatore, 'id'>) => void;
  eliminaCalciatore: (id: string) => void;
  segnaRivisto: (id: string) => void;
  segnaTuttiRivisti: () => void;

  aggiornaConfig: (patch: Partial<ConfigLega>) => void;
  rinominaAvversario: (id: string, nome: string) => void;
  incrementaSpesaAvversario: (id: string, crediti: number) => void;
  azzeraAvversario: (id: string) => void;

  applicaReferto: (
    referto: RefertoDiff,
    opzioni: Omit<OpzioniApplica, 'nuovoId'>,
    nomeFile: string,
  ) => void;
  sostituisciListone: (calciatori: Calciatore[], nomeFile: string) => void;

  registra: (tipo: TipoEvento, testo: string, automatico?: boolean) => void;
  pulisciLampeggio: () => void;

  annulla: () => void;
  ripristina: () => void;
  puoAnnullare: () => boolean;
  puoRipristinare: () => boolean;

  creaSnapshot: (etichetta: string) => void;
  ripristinaSnapshot: (id: string) => void;
  importaStato: (stato: StatoPersistito) => void;
  resetAsta: () => void;
  resetTotale: () => void;
}

function fetta(s: StatoPersistito): StatoPersistito {
  return {
    config: s.config,
    calciatori: s.calciatori,
    avversari: s.avversari,
    registroEventi: s.registroEventi,
    ultimoAggiornamentoListone: s.ultimoAggiornamentoListone,
    storicoAggiornamenti: s.storicoAggiornamenti,
  };
}

export const useStore = create<StoreFantasta>()(
  persist(
    (set, get) => {
      /**
       * Punto unico di modifica: salva lo stato precedente nella pila undo,
       * azzera il redo (una nuova azione taglia il ramo futuro) e applica.
       */
      const muta = (fn: (s: StoreFantasta) => Partial<StatoPersistito>) => {
        const prima = fetta(get());
        const patch = fn(get());
        set((s) => ({
          ...patch,
          pilaUndo: [prima, ...s.pilaUndo].slice(0, MAX_UNDO),
          pilaRedo: [],
          ultimoSalvataggio: Date.now(),
        }));
      };

      const evento = (tipo: TipoEvento, testo: string, automatico = false): EventoRegistro => ({
        id: nuovoId('ev'),
        quando: Date.now(),
        tipo,
        testo,
        automatico,
      });

      const conEvento = (
        s: StoreFantasta,
        patch: Partial<StatoPersistito>,
        ...eventi: EventoRegistro[]
      ): Partial<StatoPersistito> => ({
        ...patch,
        registroEventi: [...eventi, ...s.registroEventi].slice(0, MAX_EVENTI),
      });

      return {
        ...statoIniziale(),
        pilaUndo: [],
        pilaRedo: [],
        snapshot: [],
        ultimoSalvataggio: null,
        idLampeggio: null,

        /* ---------------------- azioni sull'asta ---------------------- */

        acquista: (id, prezzo) =>
          muta((s) => {
            const c = s.calciatori.find((x) => x.id === id);
            if (!c || !Number.isFinite(prezzo)) return {};
            return conEvento(
              s,
              {
                calciatori: s.calciatori.map((x) =>
                  x.id === id
                    ? {
                        ...x,
                        stato: 'acquistato' as const,
                        prezzoPagato: Math.round(prezzo),
                        acquirenteId: null,
                        prezzoDiMercato: null,
                      }
                    : x,
                ),
              },
              evento('acquisto', `Preso ${c.nome} (${c.squadra}) a ${Math.round(prezzo)} crediti`),
            );
          }),

        annullaAcquisto: (id) =>
          muta((s) => {
            const c = s.calciatori.find((x) => x.id === id);
            if (!c) return {};
            return conEvento(
              s,
              {
                calciatori: s.calciatori.map((x) =>
                  x.id === id
                    ? { ...x, stato: 'obiettivo' as const, prezzoPagato: null }
                    : x,
                ),
              },
              evento('acquisto', `Annullato l'acquisto di ${c.nome}`),
            );
          }),

        segnaPerso: (id, avversarioId, prezzo) =>
          muta((s) => {
            const c = s.calciatori.find((x) => x.id === id);
            if (!c) return {};
            const dopo = s.calciatori.map((x) =>
              x.id === id
                ? {
                    ...x,
                    stato: 'perso' as const,
                    acquirenteId: avversarioId,
                    prezzoDiMercato: prezzo,
                    prezzoPagato: null,
                  }
                : x,
            );
            // l'obiettivo e' uscito dal mercato: se lo slot resta scoperto, rimpiazzo
            const { calciatori, promosso } = autoRimpiazza(dopo, s.config, c.ruolo);
            const chi = avversarioId
              ? (s.avversari.find((a) => a.id === avversarioId)?.nome ?? 'un avversario')
              : 'un avversario';
            const eventi = [
              evento(
                'perdita',
                `${c.nome} → ${chi}${prezzo !== null ? ` a ${prezzo} crediti` : ''}`,
              ),
            ];
            if (promosso) {
              eventi.unshift(
                evento(
                  'rimpiazzo',
                  `Promosso a obiettivo: ${promosso.nome} (${promosso.squadra}) al posto di ${c.nome}`,
                  true,
                ),
              );
            }
            if (promosso) set({ idLampeggio: promosso.id });
            return conEvento(s, { calciatori }, ...eventi);
          }),

        scarta: (id) =>
          muta((s) => {
            const c = s.calciatori.find((x) => x.id === id);
            if (!c) return {};
            const dopo = s.calciatori.map((x) =>
              x.id === id ? { ...x, stato: 'scartato' as const } : x,
            );
            const { calciatori, promosso } = autoRimpiazza(dopo, s.config, c.ruolo);
            const eventi = [evento('scarto', `Scartato ${c.nome} (${c.squadra})`)];
            if (promosso) {
              eventi.unshift(
                evento(
                  'rimpiazzo',
                  `Promosso a obiettivo: ${promosso.nome} (${promosso.squadra}) al posto di ${c.nome}`,
                  true,
                ),
              );
              set({ idLampeggio: promosso.id });
            }
            return conEvento(s, { calciatori }, ...eventi);
          }),

        ripristinaDisponibile: (id) =>
          muta((s) => {
            const c = s.calciatori.find((x) => x.id === id);
            if (!c) return {};
            return conEvento(
              s,
              {
                calciatori: s.calciatori.map((x) =>
                  x.id === id
                    ? {
                        ...x,
                        stato: 'disponibile' as const,
                        prezzoPagato: null,
                        prezzoDiMercato: null,
                        acquirenteId: null,
                      }
                    : x,
                ),
              },
              evento('sistema', `Rimesso sul mercato ${c.nome}`),
            );
          }),

        alternaObiettivo: (id) =>
          muta((s) => {
            const c = s.calciatori.find((x) => x.id === id);
            if (!c) return {};
            const diventa = c.stato === 'obiettivo' ? 'disponibile' : 'obiettivo';
            const ordine =
              diventa === 'obiettivo'
                ? s.calciatori.reduce((m, x) => Math.max(m, x.ordineObiettivo), 0) + 1
                : 0;
            return conEvento(
              s,
              {
                calciatori: s.calciatori.map((x) =>
                  x.id === id
                    ? { ...x, stato: diventa as Calciatore['stato'], ordineObiettivo: ordine }
                    : x,
                ),
              },
              evento(
                'obiettivo',
                diventa === 'obiettivo'
                  ? `${c.nome} aggiunto agli obiettivi`
                  : `${c.nome} tolto dagli obiettivi`,
              ),
            );
          }),

        generaObiettiviMancanti: () =>
          muta((s) => {
            const { calciatori, promossi } = generaObiettivi(s.calciatori, s.config);
            if (promossi.length === 0) {
              return conEvento(
                s,
                {},
                evento('obiettivo', 'Nessuno slot scoperto: obiettivi già completi'),
              );
            }
            return conEvento(
              s,
              { calciatori },
              evento(
                'obiettivo',
                `${promossi.length} obiettivi aggiunti (i tuoi sono stati mantenuti)`,
                true,
              ),
            );
          }),

        spostaObiettivo: (ruolo, id, indice) =>
          muta((s) => ({ calciatori: riordinaObiettivi(s.calciatori, ruolo, id, indice) })),

        /* ---------------------- modifica del listone ---------------------- */

        modificaCalciatore: (id, patch, campi = []) =>
          muta((s) => ({
            calciatori: s.calciatori.map((c) =>
              c.id === id
                ? {
                    ...c,
                    ...patch,
                    // i campi toccati a mano non vanno piu' sovrascritti dall'import
                    modificatiAMano: [...new Set([...c.modificatiAMano, ...campi])],
                  }
                : c,
            ),
          })),

        aggiungiCalciatore: (c) =>
          muta((s) =>
            conEvento(
              s,
              { calciatori: [...s.calciatori, { ...c, id: nuovoId() }] },
              evento('listone', `Aggiunto a mano ${c.nome} (${c.squadra})`),
            ),
          ),

        eliminaCalciatore: (id) =>
          muta((s) => {
            const c = s.calciatori.find((x) => x.id === id);
            return conEvento(
              s,
              { calciatori: s.calciatori.filter((x) => x.id !== id) },
              evento('listone', `Eliminato dal listone ${c?.nome ?? id}`),
            );
          }),

        segnaRivisto: (id) =>
          muta((s) => ({
            calciatori: s.calciatori.map((c) =>
              c.id === id && c.daRivedere
                ? { ...c, daRivedere: { ...c.daRivedere, visto: true } }
                : c,
            ),
          })),

        segnaTuttiRivisti: () =>
          muta((s) => ({
            calciatori: s.calciatori.map((c) =>
              c.daRivedere ? { ...c, daRivedere: { ...c.daRivedere, visto: true } } : c,
            ),
          })),

        /* ---------------------- configurazione ---------------------- */

        aggiornaConfig: (patch) =>
          muta((s) => {
            const config = { ...s.config, ...patch };
            // se cambia il numero di partecipanti l'elenco avversari va riallineato
            const avversari = generaAvversari(config, s.avversari);
            return conEvento(
              s,
              { config, avversari },
              evento('config', `Configurazione aggiornata: ${descriviPatch(patch)}`),
            );
          }),

        rinominaAvversario: (id, nome) =>
          muta((s) => ({
            avversari: s.avversari.map((a) => (a.id === id ? { ...a, nome } : a)),
          })),

        incrementaSpesaAvversario: (id, crediti) =>
          muta((s) => {
            const a = s.avversari.find((x) => x.id === id);
            if (!a) return {};
            const nuoveSpese = Math.max(0, a.speseManuali + crediti);
            // il conteggio rapido aggiunge uno slot solo se sto aggiungendo spesa
            const nuoviSlot = Math.max(0, a.slotManuali + (crediti > 0 ? 1 : -1));
            return conEvento(
              s,
              {
                avversari: s.avversari.map((x) =>
                  x.id === id ? { ...x, speseManuali: nuoveSpese, slotManuali: nuoviSlot } : x,
                ),
              },
              evento(
                'perdita',
                `${a.nome}: ${crediti > 0 ? '+' : ''}${crediti} crediti (conteggio rapido)`,
              ),
            );
          }),

        azzeraAvversario: (id) =>
          muta((s) => {
            const a = s.avversari.find((x) => x.id === id);
            if (!a) return {};
            return conEvento(
              s,
              {
                avversari: s.avversari.map((x) =>
                  x.id === id ? { ...x, speseManuali: 0, slotManuali: 0 } : x,
                ),
              },
              evento('sistema', `Azzerato il conteggio rapido di ${a.nome}`),
            );
          }),

        /* ---------------------- listone: import / aggiornamento ---------------------- */

        applicaReferto: (referto, opzioni, nomeFile) => {
          // prima di toccare il listone salvo uno snapshot etichettato:
          // se l'import combina guai devo poter tornare indietro
          get().creaSnapshot(`prima di "${nomeFile}"`);
          muta((s) => {
            const esito = applicaDiff(s.calciatori, referto, { ...opzioni, nuovoId: () => nuovoId() });
            const voce: VoceStoricoListone = {
              quando: Date.now(),
              nomeFile,
              trasferimenti: referto.trasferimenti.length,
              nuovi: referto.nuovi.length,
              usciti: referto.usciti.length,
              quotazioniCambiate: referto.quotazioni.length,
              cambiRuolo: referto.cambiRuolo.length,
            };
            return conEvento(
              s,
              {
                calciatori: esito.calciatori,
                ultimoAggiornamentoListone: voce.quando,
                storicoAggiornamenti: [voce, ...s.storicoAggiornamenti].slice(0, 40),
              },
              evento(
                'listone',
                `Listone aggiornato da "${nomeFile}": ${esito.applicate} modifiche, ${voce.trasferimenti} trasferimenti, ${esito.daRivedere} da rivedere`,
                true,
              ),
            );
          });
        },

        sostituisciListone: (calciatori, nomeFile) => {
          get().creaSnapshot(`prima di "${nomeFile}"`);
          muta((s) =>
            conEvento(
              s,
              { calciatori, ultimoAggiornamentoListone: Date.now() },
              evento('listone', `Listone sostituito da "${nomeFile}": ${calciatori.length} calciatori`),
            ),
          );
        },

        /* ---------------------- registro, undo, snapshot ---------------------- */

        registra: (tipo, testo, automatico = false) =>
          set((s) => ({
            registroEventi: [evento(tipo, testo, automatico), ...s.registroEventi].slice(
              0,
              MAX_EVENTI,
            ),
          })),

        pulisciLampeggio: () => set({ idLampeggio: null }),

        annulla: () =>
          set((s) => {
            const [precedente, ...resto] = s.pilaUndo;
            if (!precedente) return {};
            return {
              ...precedente,
              pilaUndo: resto,
              pilaRedo: [fetta(s), ...s.pilaRedo].slice(0, MAX_UNDO),
              ultimoSalvataggio: Date.now(),
            };
          }),

        ripristina: () =>
          set((s) => {
            const [successivo, ...resto] = s.pilaRedo;
            if (!successivo) return {};
            return {
              ...successivo,
              pilaRedo: resto,
              pilaUndo: [fetta(s), ...s.pilaUndo].slice(0, MAX_UNDO),
              ultimoSalvataggio: Date.now(),
            };
          }),

        puoAnnullare: () => get().pilaUndo.length > 0,
        puoRipristinare: () => get().pilaRedo.length > 0,

        creaSnapshot: (etichetta) =>
          set((s) => ({
            snapshot: [
              { id: nuovoId('snap'), quando: Date.now(), etichetta, stato: fetta(s) },
              ...s.snapshot,
            ].slice(0, MAX_SNAPSHOT),
          })),

        ripristinaSnapshot: (id) =>
          muta((s) => {
            const snap = s.snapshot.find((x) => x.id === id);
            if (!snap) return {};
            return conEvento(
              { ...s, ...snap.stato },
              snap.stato,
              evento('sistema', `Ripristinato lo snapshot "${snap.etichetta}"`),
            );
          }),

        importaStato: (stato) => {
          get().creaSnapshot('prima dell import di backup');
          muta((s) => conEvento({ ...s, ...stato }, stato, evento('sistema', 'Stato importato da file JSON')));
        },

        /* Azzera l'asta ma conserva il listone e le mie note: serve per
           l'asta di riparazione o per una prova a vuoto. */
        resetAsta: () => {
          get().creaSnapshot("prima del reset dell'asta");
          muta((s) =>
            conEvento(
              s,
              {
                calciatori: s.calciatori.map((c) => ({
                  ...c,
                  stato: 'disponibile' as const,
                  prezzoPagato: null,
                  prezzoDiMercato: null,
                  acquirenteId: null,
                  ordineObiettivo: 0,
                })),
                avversari: s.avversari.map((a) => ({ ...a, speseManuali: 0, slotManuali: 0 })),
              },
              evento('sistema', 'Asta azzerata: listone e note conservati'),
            ),
          );
        },

        resetTotale: () => {
          get().creaSnapshot('prima del reset totale');
          muta(() => ({ ...statoIniziale() }));
        },
      };
    },
    {
      name: 'fantasta-assistant',
      version: 5,
      /* Chi aveva gia' aperto l'app prima dei campi su rigori e punizioni ha
         in localStorage calciatori senza quei campi: senza migrazione la UI
         leggerebbe undefined. Non provo a indovinare chi tira: metto false e
         il listone aggiornato porta i dati veri.
         La v3 aggiunge linkFormazioniProbabili a ConfigLega: chi ha una
         config salvata prima non avrebbe quel campo, quindi la fondo sempre
         coi default correnti invece di elencare un merge per ogni versione. */
      migrate: (salvato, versione) => {
        const s = salvato as StatoPersistito;
        if (s?.config) s.config = { ...CONFIG_DEFAULT, ...s.config };
        /* La v4 da' un nome alla lega e alla mia squadra e sposta i default a
           300 crediti / 10 partecipanti. Chi aveva ancora i vecchi default (500 e
           8, mai toccati) viene portato ai nuovi; chi li aveva gia' cambiati
           tiene i suoi, perche' li' c'e' una scelta vera da rispettare. */
        if (versione < 4 && s?.config) {
          const suiVecchiDefault = s.config.budgetTotale === 500 && s.config.numPartecipanti === 8;
          if (suiVecchiDefault) {
            s.config.budgetTotale = CONFIG_DEFAULT.budgetTotale;
            s.config.numPartecipanti = CONFIG_DEFAULT.numPartecipanti;
            /* Gli avversari generici e a zero spese non contengono lavoro mio:
               li rifaccio coi nomi veri. Se ne ho rinominato o tracciato anche
               uno solo, li conservo e mi limito ad allungare l'elenco. */
            const intatti = (s.avversari ?? []).every(
              (a) => /^Squadra \d+$/.test(a.nome) && a.speseManuali === 0 && a.slotManuali === 0,
            );
            s.avversari = generaAvversari(s.config, intatti ? [] : s.avversari);
          }
        }
        /* La v5 corregge un nome sbagliato in fase di inserimento: la squadra
           dell'elenco e' "Venezezia", non "Venezia". Rinomino solo se e' ancora
           quella generata da me e intatta, per non sovrascrivere una scelta. */
        if (versione < 5 && s?.avversari) {
          s.avversari = s.avversari.map((a) =>
            a.nome === 'Venezia' && a.speseManuali === 0 && a.slotManuali === 0
              ? { ...a, nome: 'Venezezia' }
              : a,
          );
        }
        if (versione < 2 && s?.calciatori) {
          s.calciatori = s.calciatori.map((c) => ({
            ...c,
            rigoristaIncerto: c.rigoristaIncerto ?? false,
            tiratorePunizioni: c.tiratorePunizioni ?? false,
          }));
        }
        return s as unknown as StoreFantasta;
      },
      storage: createJSONStorage(() => localStorage),
      // undo, redo e snapshot restano in memoria: non ha senso ricaricarli
      // a inizio sessione, e terrebbero il localStorage occupato per niente
      partialize: (s) => fetta(s) as unknown as StoreFantasta,
    },
  ),
);

function descriviPatch(patch: Partial<ConfigLega>): string {
  const parti: string[] = [];
  if (patch.nomeLega !== undefined) parti.push(`lega "${patch.nomeLega}"`);
  if (patch.nomeMiaSquadra !== undefined) parti.push(`squadra "${patch.nomeMiaSquadra}"`);
  if (patch.budgetTotale !== undefined) parti.push(`budget ${patch.budgetTotale}`);
  if (patch.numPartecipanti !== undefined) parti.push(`${patch.numPartecipanti} partecipanti`);
  if (patch.prezzoMinimoSlot !== undefined) parti.push(`prezzo minimo ${patch.prezzoMinimoSlot}`);
  if (patch.slotPerRuolo) parti.push(`slot ${RUOLI.map((r) => patch.slotPerRuolo![r]).join('/')}`);
  if (patch.percBudgetPerRuolo)
    parti.push(`ripartizione ${RUOLI.map((r) => patch.percBudgetPerRuolo![r]).join('/')}%`);
  if (patch.sogliaConcentrazioneSquadra !== undefined)
    parti.push(`soglia concentrazione ${patch.sogliaConcentrazioneSquadra}`);
  return parti.join(', ') || 'modifica';
}
