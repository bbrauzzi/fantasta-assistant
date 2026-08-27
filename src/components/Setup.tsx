/* Setup lega (config), backup e ripristino (F11). */

import { useRef, useState } from 'react';
import { AlertTriangle, Download, Upload } from 'lucide-react';
import type { ConfigLega, Ruolo, StatoPersistito } from '../types';
import { RUOLI, RUOLO_LABEL } from '../domain/costanti';
import { NUMERO_CALCIATORI_SEED } from '../data/listone-seed';
import { budgetPerRuolo } from '../domain/budget';
import { useStore } from '../store/store';
import { useStatoBudget } from '../store/derivati';
import { useUI, type Tema } from '../store/ui';
import { dataPerNomeFile, scarica } from '../lib/file';
import { Campo, Nota, Numero, Pannello, Pulsante } from '../ui/primitive';

/* Colori letterali (non token): la vetrina del tema deve mostrare l'aspetto
   di ENTRAMBI i temi, non solo di quello attivo. */
const TEMI: Array<{
  id: Tema;
  nome: string;
  nota: string;
  bg: string;
  accento: string;
  ok: string;
  danger: string;
}> = [
  {
    id: 'grafite',
    nome: 'Grafite rame',
    nota: 'Grigio neutro, un solo accento rame. Tabelle a filetti, nessun riquadro.',
    bg: '#2A2A2A',
    accento: '#E08B4F',
    ok: '#7D9C85',
    danger: '#C2564B',
  },
  {
    id: 'campo',
    nome: 'Campo verde',
    nota: 'Il tema originale: verde da campo, testo gesso, oro per obiettivi e max offerta.',
    bg: '#0B3D2E',
    accento: '#D4AF37',
    ok: '#4E9C6E',
    danger: '#C24B3F',
  },
];

function PannelloTema() {
  const tema = useUI((s) => s.tema);
  const setTema = useUI((s) => s.setTema);

  return (
    <Pannello titolo="Tema">
      <div className="flex flex-col gap-[8px]">
        {TEMI.map((t) => {
          const selezionato = t.id === tema;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTema(t.id)}
              className="flex items-center gap-[11px] rounded-[var(--raggio-controllo)] text-left"
              style={{
                padding: '9px 10px',
                background: selezionato
                  ? 'color-mix(in srgb, var(--color-gold) 10%, transparent)'
                  : 'transparent',
                border: `1px solid ${selezionato ? 'var(--color-gold)' : 'var(--color-line)'}`,
              }}
            >
              <span
                className="flex shrink-0 overflow-hidden rounded-[2px]"
                style={{ border: '1px solid rgba(0,0,0,.35)' }}
              >
                <span style={{ display: 'block', width: 16, height: 26, background: t.bg }} />
                <span style={{ display: 'block', width: 9, height: 26, background: t.accento }} />
                <span style={{ display: 'block', width: 9, height: 26, background: t.ok }} />
                <span style={{ display: 'block', width: 9, height: 26, background: t.danger }} />
              </span>
              <span className="min-w-0 flex-1">
                <span
                  className="block text-[12px] font-bold"
                  style={{ color: selezionato ? 'var(--color-gold)' : 'var(--color-chalk)' }}
                >
                  {t.nome}
                </span>
                <span className="mt-[1px] block text-[10px] leading-[1.4] text-dim">{t.nota}</span>
              </span>
              <span
                className="shrink-0 rounded-full"
                style={{
                  width: 14,
                  height: 14,
                  border: `1px solid ${selezionato ? 'var(--color-gold)' : 'var(--color-line)'}`,
                  background: selezionato ? 'var(--color-gold)' : 'transparent',
                }}
              />
            </button>
          );
        })}
      </div>
      <Nota>
        La scelta vale per tutta l'app e viene salvata con le altre preferenze. I quattro colori di
        stato — tuo, perso, attenzione, obiettivo — restano distinguibili in entrambi i temi.
      </Nota>
    </Pannello>
  );
}

export function Setup() {
  const config = useStore((s) => s.config);
  const aggiornaConfig = useStore((s) => s.aggiornaConfig);
  const resetAsta = useStore((s) => s.resetAsta);
  const resetTotale = useStore((s) => s.resetTotale);
  const importaStato = useStore((s) => s.importaStato);
  const storico = useStore((s) => s.storicoAggiornamenti);
  const st = useStatoBudget();

  const fileRif = useRef<HTMLInputElement>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [conferma, setConferma] = useState<'asta' | 'totale' | null>(null);

  const budget = budgetPerRuolo(config);
  const sommaPerc = RUOLI.reduce((s, r) => s + config.percBudgetPerRuolo[r], 0);
  const slotTotali = RUOLI.reduce((s, r) => s + config.slotPerRuolo[r], 0);

  const numerico = (v: string, minimo = 0) => Math.max(minimo, Number(v.replace(/[^0-9]/g, '')) || 0);

  const caricaBackup = async (file: File) => {
    try {
      const dati = JSON.parse(await file.text()) as StatoPersistito;
      if (!Array.isArray(dati.calciatori) || !dati.config) {
        throw new Error('il file non contiene uno stato di FantAsta');
      }
      importaStato(dati);
      setErrore(null);
    } catch (e) {
      setErrore(`Non sono riuscito a leggere il backup: ${(e as Error).message}`);
    }
  };

  return (
    <div className="grid gap-[16px] px-[18px] py-[16px]" style={{ gridTemplateColumns: '1fr 1fr 330px' }}>
      <Pannello titolo="Parametri della lega">
        <div className="flex flex-col gap-[10px]">
          <CampoTesto
            etichetta="Nome della lega"
            valore={config.nomeLega}
            onCambia={(v) => aggiornaConfig({ nomeLega: v })}
          />
          <CampoTesto
            etichetta="La mia squadra"
            valore={config.nomeMiaSquadra}
            onCambia={(v) => aggiornaConfig({ nomeMiaSquadra: v })}
          />
          <CampoNumerico
            etichetta="Budget totale"
            valore={config.budgetTotale}
            onCambia={(v) => aggiornaConfig({ budgetTotale: numerico(v, 1) })}
          />
          <CampoNumerico
            etichetta="Partecipanti"
            valore={config.numPartecipanti}
            onCambia={(v) => aggiornaConfig({ numPartecipanti: numerico(v, 2) })}
          />
          <CampoNumerico
            etichetta="Prezzo minimo di uno slot"
            valore={config.prezzoMinimoSlot}
            onCambia={(v) => aggiornaConfig({ prezzoMinimoSlot: numerico(v, 0) })}
          />
          <CampoNumerico
            etichetta="Soglia concentrazione squadra"
            valore={config.sogliaConcentrazioneSquadra}
            onCambia={(v) => aggiornaConfig({ sogliaConcentrazioneSquadra: numerico(v, 2) })}
          />
        </div>
        <Nota>
          Il prezzo consigliato viene riscalato su questi numeri: con {config.budgetTotale} crediti e{' '}
          {config.numPartecipanti} partecipanti il fattore è{' '}
          <b className="n">
            {((config.budgetTotale / 500) * (config.numPartecipanti / 8)).toFixed(2)}×
          </b>{' '}
          rispetto al listino ufficiale (tarato su 500 crediti e 8 partecipanti).
        </Nota>
      </Pannello>

      <Pannello titolo={`Slot e ripartizione — ${slotTotali} slot`}>
        <div className="grid gap-[6px]" style={{ gridTemplateColumns: '1fr 70px 70px 70px' }}>
          <span className="titolo-pannello self-end">Ruolo</span>
          <span className="titolo-pannello self-end text-right">Slot</span>
          <span className="titolo-pannello self-end text-right">% budget</span>
          <span className="titolo-pannello self-end text-right">Crediti</span>
          {RUOLI.map((r) => (
            <RigaRuolo
              key={r}
              ruolo={r}
              config={config}
              crediti={budget[r]}
              onSlot={(v) =>
                aggiornaConfig({
                  slotPerRuolo: { ...config.slotPerRuolo, [r]: numerico(v, 0) } as Record<Ruolo, number>,
                })
              }
              onPerc={(v) =>
                aggiornaConfig({
                  percBudgetPerRuolo: {
                    ...config.percBudgetPerRuolo,
                    [r]: numerico(v, 0),
                  } as Record<Ruolo, number>,
                })
              }
            />
          ))}
        </div>
        <Nota tono={sommaPerc === 100 ? 'dim' : 'amber'}>
          {sommaPerc === 100
            ? 'La ripartizione somma a 100%.'
            : `La ripartizione somma a ${sommaPerc}%: non è un errore bloccante, ma i budget di ruolo non coprono esattamente il totale.`}
        </Nota>
      </Pannello>

      <aside className="flex flex-col gap-[12px]">
        <PannelloTema />

        <Pannello titolo="Link esterni">
          <label className="flex flex-col gap-[5px]">
            <span className="text-[12px] text-dim">Probabili formazioni</span>
            <Campo
              value={config.linkFormazioniProbabili}
              onChange={(e) => aggiornaConfig({ linkFormazioniProbabili: e.target.value })}
              placeholder="https://…"
              className="text-[11px]"
            />
          </label>
          <Nota>
            Il pulsante «Probabili formazioni» nel listone apre questo indirizzo in una nuova
            scheda. Cambia ogni stagione: se il link non funziona più, aggiornalo qui.
          </Nota>
        </Pannello>

        <Pannello titolo="Backup e ripristino">
          <div className="flex flex-col gap-[8px]">
            <Pulsante
              variante="fantasma"
              className="flex items-center justify-center gap-[6px]"
              onClick={() =>
                scarica(
                  JSON.stringify(
                    {
                      config: useStore.getState().config,
                      calciatori: useStore.getState().calciatori,
                      avversari: useStore.getState().avversari,
                      registroEventi: useStore.getState().registroEventi,
                      ultimoAggiornamentoListone: useStore.getState().ultimoAggiornamentoListone,
                      storicoAggiornamenti: useStore.getState().storicoAggiornamenti,
                    } satisfies StatoPersistito,
                    null,
                    2,
                  ),
                  `fantasta-backup-${dataPerNomeFile()}.json`,
                  'application/json',
                )
              }
            >
              <Download size={13} /> Esporta tutto lo stato (JSON)
            </Pulsante>
            <Pulsante
              variante="fantasma"
              className="flex items-center justify-center gap-[6px]"
              onClick={() => fileRif.current?.click()}
            >
              <Upload size={13} /> Importa un backup
            </Pulsante>
            <input
              ref={fileRif}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void caricaBackup(f);
                e.target.value = '';
              }}
            />
            {errore && <p className="text-[11px] text-danger">{errore}</p>}
          </div>
          <Nota>
            Il salvataggio su questo browser è automatico a ogni modifica: non esiste un pulsante
            «salva». L'export JSON serve per il backup manuale e per passare a un altro PC.
          </Nota>
        </Pannello>

        <Pannello titolo="Azioni distruttive">
          {conferma === null ? (
            <div className="flex flex-col gap-[8px]">
              <Pulsante variante="danger" onClick={() => setConferma('asta')}>
                Azzera l'asta (tieni listone e note)
              </Pulsante>
              <Pulsante variante="danger" onClick={() => setConferma('totale')}>
                Ripristina il listone di partenza
              </Pulsante>
            </div>
          ) : (
            <div className="flex flex-col gap-[8px]">
              <p className="flex items-start gap-[6px] text-[11px] leading-[1.5] text-amber">
                <AlertTriangle size={13} className="mt-[1px] shrink-0" />
                {conferma === 'asta'
                  ? "Azzera stati, prezzi e conteggi degli avversari. Listone, note e configurazione restano. Uno snapshot viene salvato prima."
                  : `Riporta tutto al listone seed (${NUMERO_CALCIATORI_SEED} calciatori indicativi) e perde le tue note. Uno snapshot viene salvato prima.`}
              </p>
              <div className="flex gap-[8px]">
                <Pulsante variante="dim" onClick={() => setConferma(null)}>
                  Annulla
                </Pulsante>
                <Pulsante
                  variante="danger"
                  onClick={() => {
                    if (conferma === 'asta') resetAsta();
                    else resetTotale();
                    setConferma(null);
                  }}
                >
                  Confermo
                </Pulsante>
              </div>
            </div>
          )}
        </Pannello>

        <Pannello titolo="Stato attuale">
          <div className="flex flex-col gap-[5px] text-[12px]">
            <Riga etichetta="Calciatori nel listone" valore={useStore.getState().calciatori.length} />
            <Riga etichetta="Slot totali" valore={st.slotTotali} />
            <Riga etichetta="Speso" valore={st.speso} />
            <Riga etichetta="Aggiornamenti listone" valore={storico.length} />
          </div>
          {storico.length > 0 && (
            <ul className="mt-[9px] flex flex-col gap-[3px]">
              {storico.slice(0, 5).map((v, i) => (
                <li key={i} className="text-[10px] text-dim">
                  <span className="n">{new Date(v.quando).toLocaleString('it-IT')}</span> — {v.nomeFile}:{' '}
                  {v.trasferimenti} trasferimenti, {v.nuovi} nuovi, {v.usciti} usciti
                </li>
              ))}
            </ul>
          )}
        </Pannello>
      </aside>
    </div>
  );
}

function CampoTesto({
  etichetta,
  valore,
  onCambia,
}: {
  etichetta: string;
  valore: string;
  onCambia: (v: string) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-[10px]">
      <span className="shrink-0 text-[12px] text-dim">{etichetta}</span>
      <Campo
        className="min-w-0 flex-1 text-right"
        value={valore}
        onChange={(e) => onCambia(e.target.value)}
      />
    </label>
  );
}

function CampoNumerico({
  etichetta,
  valore,
  onCambia,
}: {
  etichetta: string;
  valore: number;
  onCambia: (v: string) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-[10px]">
      <span className="text-[12px] text-dim">{etichetta}</span>
      <Campo
        className="n w-[86px] text-center"
        value={String(valore)}
        inputMode="numeric"
        onChange={(e) => onCambia(e.target.value)}
      />
    </label>
  );
}

function RigaRuolo({
  ruolo,
  config,
  crediti,
  onSlot,
  onPerc,
}: {
  ruolo: Ruolo;
  config: ConfigLega;
  crediti: number;
  onSlot: (v: string) => void;
  onPerc: (v: string) => void;
}) {
  return (
    <>
      <span className="self-center text-[12px]">{RUOLO_LABEL[ruolo]}</span>
      <Campo
        className="n !px-[6px] !py-[5px] text-center"
        value={String(config.slotPerRuolo[ruolo])}
        inputMode="numeric"
        onChange={(e) => onSlot(e.target.value)}
        aria-label={`Slot ${RUOLO_LABEL[ruolo]}`}
      />
      <Campo
        className="n !px-[6px] !py-[5px] text-center"
        value={String(config.percBudgetPerRuolo[ruolo])}
        inputMode="numeric"
        onChange={(e) => onPerc(e.target.value)}
        aria-label={`Percentuale budget ${RUOLO_LABEL[ruolo]}`}
      />
      <span className="self-center text-right">
        <Numero valore={crediti} dimensione={13} />
      </span>
    </>
  );
}

function Riga({ etichetta, valore }: { etichetta: string; valore: string | number }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-dim">{etichetta}</span>
      <Numero valore={valore} dimensione={13} />
    </div>
  );
}
