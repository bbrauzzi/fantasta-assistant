/* Modali brevi: seconda conferma sullo sforo del budget totale,
   aggiunta di un calciatore a mano, mappa delle scorciatoie. */

import { useState } from 'react';
import type { Calciatore, Fascia, Ruolo } from '../types';
import { FASCE, RUOLI, RUOLO_LABEL } from '../domain/costanti';
import { useStore } from '../store/store';
import { useUI } from '../store/ui';
import { Campo, Pulsante, Selezione } from '../ui/primitive';
import { Modale } from '../ui/Modale';

/* ------------------- seconda conferma: sforo del totale ------------------- */

export function ModaleConfermaAcquisto({
  calciatore,
  prezzo,
  motivo,
  onChiudi,
}: {
  calciatore: Calciatore;
  prezzo: number;
  motivo: string;
  onChiudi: () => void;
}) {
  const acquista = useStore((s) => s.acquista);
  const pulisciBozza = useUI((s) => s.pulisciBozza);

  return (
    <Modale
      titolo="Confermi lo sforo?"
      larghezza={480}
      onChiudi={onChiudi}
      piede={
        <>
          <Pulsante variante="dim" onClick={onChiudi}>
            Torna indietro
          </Pulsante>
          <Pulsante
            variante="oro"
            onClick={() => {
              acquista(calciatore.id, prezzo);
              pulisciBozza(calciatore.id);
              onChiudi();
            }}
          >
            Sì, prendilo a {prezzo}
          </Pulsante>
        </>
      }
    >
      <p className="text-[13px] leading-[1.6]">
        Stai per prendere <b>{calciatore.nome}</b> ({calciatore.squadra}) a{' '}
        <b className="n">{prezzo}</b> crediti.
      </p>
      <p className="mt-[10px] text-[13px] font-bold" style={{ color: 'var(--color-danger)' }}>
        {motivo}
      </p>
      <p className="mt-[12px] text-[11px] leading-[1.5] text-dim">
        Chiedo conferma solo qui, perché uno sforo del budget totale è quasi sempre un errore di
        battitura. Se è una scelta deliberata, conferma: l'operazione resta annullabile con Ctrl+Z.
      </p>
    </Modale>
  );
}

/* ---------------------- aggiunta di un calciatore ---------------------- */

export function ModaleNuovoCalciatore({ onChiudi }: { onChiudi: () => void }) {
  const aggiungi = useStore((s) => s.aggiungiCalciatore);
  const [nome, setNome] = useState('');
  const [squadra, setSquadra] = useState('');
  const [ruolo, setRuolo] = useState<Ruolo>('C');
  const [fascia, setFascia] = useState<Fascia>('Terza fascia');
  const [quotazione, setQuotazione] = useState('5');
  const [prob, setProb] = useState('70');
  const [rigorista, setRigorista] = useState(false);
  const [punizioni, setPunizioni] = useState(false);

  const valido = nome.trim() !== '' && squadra.trim() !== '';

  return (
    <Modale
      titolo="Aggiungi un calciatore"
      sottotitolo="Per chi manca dal listone: un neoacquisto, un ripescato, un nome che ti sei segnato."
      larghezza={520}
      onChiudi={onChiudi}
      piede={
        <>
          <Pulsante variante="dim" onClick={onChiudi}>
            Annulla
          </Pulsante>
          <Pulsante
            variante="oro"
            disabled={!valido}
            onClick={() => {
              aggiungi({
                nome: nome.trim(),
                squadra: squadra.trim(),
                ruolo,
                fascia,
                rigorista,
                rigoristaIncerto: false,
                tiratorePunizioni: punizioni,
                probTitolare: Number(prob) || 0,
                quotazioneBase: Number(quotazione) || 1,
                stato: 'disponibile',
                prezzoPagato: null,
                prezzoDiMercato: null,
                acquirenteId: null,
                note: '',
                ordineObiettivo: 0,
                daRivedere: null,
                modificatiAMano: [],
              });
              onChiudi();
            }}
          >
            Aggiungi
          </Pulsante>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-[10px]">
        <label className="flex flex-col gap-[5px]">
          <span className="titolo-pannello">Nome</span>
          <Campo value={nome} onChange={(e) => setNome(e.target.value)} />
        </label>
        <label className="flex flex-col gap-[5px]">
          <span className="titolo-pannello">Squadra</span>
          <Campo value={squadra} onChange={(e) => setSquadra(e.target.value)} />
        </label>
        <label className="flex flex-col gap-[5px]">
          <span className="titolo-pannello">Ruolo</span>
          <Selezione value={ruolo} onChange={(e) => setRuolo(e.target.value as Ruolo)}>
            {RUOLI.map((r) => (
              <option key={r} value={r}>
                {RUOLO_LABEL[r]}
              </option>
            ))}
          </Selezione>
        </label>
        <label className="flex flex-col gap-[5px]">
          <span className="titolo-pannello">Fascia</span>
          <Selezione value={fascia} onChange={(e) => setFascia(e.target.value as Fascia)}>
            {FASCE.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </Selezione>
        </label>
        <label className="flex flex-col gap-[5px]">
          <span className="titolo-pannello">Quotazione base</span>
          <Campo
            className="n"
            value={quotazione}
            onChange={(e) => setQuotazione(e.target.value.replace(/[^0-9]/g, ''))}
            inputMode="numeric"
          />
        </label>
        <label className="flex flex-col gap-[5px]">
          <span className="titolo-pannello">% titolarità</span>
          <Campo
            className="n"
            value={prob}
            onChange={(e) => setProb(e.target.value.replace(/[^0-9]/g, ''))}
            inputMode="numeric"
          />
        </label>
      </div>
      <div className="mt-[12px] flex gap-[18px]">
        <label className="flex cursor-pointer items-center gap-[7px] text-[12px]">
          <input type="checkbox" checked={rigorista} onChange={(e) => setRigorista(e.target.checked)} />
          Tira i rigori
        </label>
        <label className="flex cursor-pointer items-center gap-[7px] text-[12px]">
          <input type="checkbox" checked={punizioni} onChange={(e) => setPunizioni(e.target.checked)} />
          Batte le punizioni
        </label>
      </div>
    </Modale>
  );
}

/* ---------------------- mappa delle scorciatoie ---------------------- */

const SCORCIATOIE: Array<[string, string]> = [
  ['/', 'Vai al campo di ricerca'],
  ['↑ ↓', 'Naviga i risultati'],
  ['Invio', 'Apri il simulatore di offerta sul selezionato'],
  ['A', 'Segna come acquistato da me (apre il campo prezzo)'],
  ['V', 'Segna come preso da un avversario'],
  ['S', 'Scarta'],
  ['O', 'Aggiungi o togli dagli obiettivi'],
  ['E', 'Modifica il calciatore selezionato (squadra, fascia, titolarità, note)'],
  ['F', 'Attiva o disattiva la modalità asta rapida'],
  ['M', 'Apri la vista formazioni per modulo'],
  ['Ctrl+Z', 'Annulla'],
  ['Ctrl+Shift+Z', 'Ripristina'],
  ['Esc', 'Chiudi la finestra o annulla l’input corrente'],
  ['?', 'Mostra questa mappa'],
];

export function ModaleAiuto({ onChiudi }: { onChiudi: () => void }) {
  return (
    <Modale
      titolo="Scorciatoie da tastiera"
      sottotitolo="Non si attivano mentre scrivi in un campo di testo (tranne Esc)."
      larghezza={520}
      onChiudi={onChiudi}
      piede={
        <Pulsante variante="oro" onClick={onChiudi}>
          Chiudi
        </Pulsante>
      }
    >
      <dl className="flex flex-col gap-[6px]">
        {SCORCIATOIE.map(([tasto, azione]) => (
          <div key={tasto} className="flex items-center gap-[12px]">
            <dt
              className="n rounded-[5px] border border-line px-[8px] py-[3px] text-center text-[11px] font-bold"
              style={{ minWidth: 96, background: 'rgba(0,0,0,.3)' }}
            >
              {tasto}
            </dt>
            <dd className="text-[12px]">{azione}</dd>
          </div>
        ))}
      </dl>
    </Modale>
  );
}
