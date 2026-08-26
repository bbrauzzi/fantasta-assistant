/* F10 - modalità asta rapida. Interamente utilizzabile da tastiera:
   se devo spostare la mano sul trackpad, ha fallito. */

import { useEffect, useMemo, useRef, useState } from 'react';
import { cercaPerAstaRapida } from '../domain/filtri';
import { formattaScostamento, prezzoConsigliato, simulaOfferta } from '../domain/budget';
import { chiPuoRilanciare, type AvversarioCalcolato } from '../domain/avversari';
import { useStore } from '../store/store';
import { useAvversariCalcolati, useStatoBudget } from '../store/derivati';
import { BadgeFascia, BadgeRig, BadgeRuolo, Numero } from '../ui/primitive';

export function AstaRapida({ onChiudi }: { onChiudi: () => void }) {
  const calciatori = useStore((s) => s.calciatori);
  const config = useStore((s) => s.config);
  const acquista = useStore((s) => s.acquista);
  const segnaPerso = useStore((s) => s.segnaPerso);
  const scarta = useStore((s) => s.scarta);
  const annulla = useStore((s) => s.annulla);
  const eventi = useStore((s) => s.registroEventi);
  const st = useStatoBudget();
  const avversari = useAvversariCalcolati();

  const [query, setQuery] = useState('');
  const [indice, setIndice] = useState(0);
  const [offerta, setOfferta] = useState('');
  /** true quando sto scegliendo a quale avversario è andato il calciatore */
  const [sceltaAvversario, setSceltaAvversario] = useState(false);
  const campoRicerca = useRef<HTMLInputElement>(null);
  const campoOfferta = useRef<HTMLInputElement>(null);

  const risultati = useMemo(() => cercaPerAstaRapida(calciatori, query), [calciatori, query]);
  const scelto = risultati[Math.min(indice, Math.max(0, risultati.length - 1))] ?? null;

  useEffect(() => campoRicerca.current?.focus(), []);
  useEffect(() => setIndice(0), [query]);

  const consigliato = scelto ? prezzoConsigliato(scelto.quotazioneBase, config) : 0;
  const valore = offerta === '' ? consigliato : Number(offerta);
  const sim =
    scelto && Number.isFinite(valore)
      ? simulaOfferta(valore, scelto.ruolo, scelto.quotazioneBase, st, config)
      : null;
  const rilanci = scelto && sim ? chiPuoRilanciare(avversari, sim.offerta, scelto.ruolo) : null;

  const azzera = () => {
    setQuery('');
    setOfferta('');
    setIndice(0);
    setSceltaAvversario(false);
    campoRicerca.current?.focus();
  };

  const fai = (azione: 'preso' | 'scarta') => {
    if (!scelto) return;
    if (azione === 'preso') acquista(scelto.id, Number.isFinite(valore) ? valore : consigliato);
    if (azione === 'scarta') scarta(scelto.id);
    azzera();
  };

  /** Apre il selettore di squadra: si preme V, poi un numero, senza mouse. */
  const apriSceltaAvversario = () => {
    if (!scelto) return;
    setSceltaAvversario(true);
    requestAnimationFrame(() => campoOfferta.current?.focus());
  };

  const confermaAvversario = (avversarioId: string | null) => {
    if (!scelto) return;
    segnaPerso(scelto.id, avversarioId, offerta === '' ? null : Number(offerta));
    azzera();
  };

  /* Tutta la navigazione passa da qui: frecce, Tab al campo offerta,
     Invio conferma, e le tre lettere per le azioni quando non sto scrivendo
     nel campo di ricerca. */
  const tasti = (e: React.KeyboardEvent) => {
    // mentre scelgo l'avversario, i tasti hanno un significato diverso:
    // un numero seleziona la squadra, Invio vale "non lo so", Esc annulla.
    if (sceltaAvversario) {
      e.preventDefault();
      if (e.key === 'Escape') {
        setSceltaAvversario(false);
        // la scorciatoia globale sfoca i campi su Esc mentre scrivo: senza
        // rimetterci a fuoco qui, V e S smetterebbero di funzionare dopo
        // un annullamento, rompendo l'uso da tastiera dell'asta rapida
        requestAnimationFrame(() => campoOfferta.current?.focus());
        return;
      }
      if (e.key === 'Enter') {
        confermaAvversario(null);
        return;
      }
      const n = Number(e.key);
      if (Number.isInteger(n) && n >= 1 && n <= Math.min(9, avversari.length)) {
        confermaAvversario(avversari[n - 1].id);
      }
      // qualsiasi altro tasto non fa nulla: non deve toccare il campo offerta
      return;
    }

    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      setIndice((i) =>
        Math.max(0, Math.min(risultati.length - 1, i + (e.key === 'ArrowDown' ? 1 : -1))),
      );
      return;
    }
    if (e.key === 'Tab' && !e.shiftKey && scelto) {
      e.preventDefault();
      campoOfferta.current?.focus();
      campoOfferta.current?.select();
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      fai('preso');
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      if (query || offerta) azzera();
      else onChiudi();
      return;
    }
    // v e s sono lettere: valgono come azione solo dal campo offerta,
    // altrimenti non potrei più scrivere "Vlahovic"
    if (e.currentTarget === campoOfferta.current) {
      const k = e.key.toLowerCase();
      if (k === 'v') {
        e.preventDefault();
        apriSceltaAvversario();
      }
      if (k === 's') {
        e.preventDefault();
        fai('scarta');
      }
    }
  };

  const coloreBordo = !sim
    ? 'var(--color-gold)'
    : sim.gravita === 'blocco'
      ? 'var(--color-danger)'
      : sim.gravita === 'attenzione'
        ? 'var(--color-amber)'
        : 'var(--color-gold)';

  return (
    <div
      className="flex min-h-screen flex-col gap-[22px] px-[34px] py-[28px]"
      style={{ background: 'var(--color-pitch-deep)' }}
    >
      <header className="flex items-center gap-[24px]">
        <span
          className="uppercase text-dim"
          style={{ fontFamily: 'var(--font-cond)', fontSize: 20, letterSpacing: '.14em' }}
        >
          Asta rapida
        </span>
        <div className="ml-auto flex items-end gap-[34px]">
          <div>
            <div className="uppercase text-dim" style={{ fontSize: 10, letterSpacing: '.14em' }}>
              Crediti residui
            </div>
            <span
              className="n block whitespace-nowrap font-bold"
              style={{ fontSize: 78, lineHeight: 0.95, color: st.residui < 0 ? 'var(--color-danger)' : undefined }}
            >
              {st.residui}
            </span>
          </div>
          <div>
            <div className="uppercase text-gold" style={{ fontSize: 10, letterSpacing: '.14em' }}>
              Max offerta
            </div>
            <span
              className="n block whitespace-nowrap font-bold text-gold"
              style={{ fontSize: 78, lineHeight: 0.95 }}
            >
              {st.maxOfferta}
            </span>
          </div>
          <button
            type="button"
            onClick={onChiudi}
            className="rounded-[8px] border border-line px-[14px] py-[8px] text-[12px] font-bold text-dim"
          >
            Esc per uscire
          </button>
        </div>
      </header>

      <input
        ref={campoRicerca}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={tasti}
        placeholder="Digita le prime lettere del cognome…"
        aria-label="Cerca calciatore"
        className="w-full rounded-[12px] font-bold outline-none"
        style={{
          background: 'rgba(0,0,0,.45)',
          border: '2px solid var(--color-gold)',
          padding: '18px 22px',
          fontSize: 34,
          caretColor: 'var(--color-gold)',
        }}
      />

      <div className="flex flex-col gap-[8px]">
        {risultati.length === 0 && query !== '' && (
          <p className="text-[16px] text-dim">Nessun calciatore ancora sul mercato con questo nome.</p>
        )}
        {risultati.map((c, i) => {
          const attivo = c === scelto;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => setIndice(i)}
              className="flex items-center gap-[16px] rounded-[10px] px-[16px] py-[12px] text-left"
              style={{
                background: attivo ? 'rgba(212,175,55,.15)' : 'rgba(0,0,0,.25)',
                border: `1px solid ${attivo ? 'var(--color-gold)' : 'var(--color-line)'}`,
                opacity: attivo ? 1 : 0.8,
              }}
            >
              <BadgeRuolo ruolo={c.ruolo} dimensione={34} />
              <b className="text-[28px] font-bold">{c.nome}</b>
              <span className="text-[17px] text-dim">{c.squadra}</span>
              <BadgeFascia fascia={c.fascia} piccolo={false} />
              {c.rigorista && <BadgeRig grande incerto={c.rigoristaIncerto} />}
              <Numero valore={`${c.probTitolare}% tit.`} dimensione={17} peso={500} />
              {c.stato === 'obiettivo' && <span className="text-[13px] font-bold text-gold">obiettivo</span>}
              {c.stato === 'scartato' && <span className="text-[13px] text-dim">scartato</span>}
              <span className="ml-auto text-right">
                <span className="block text-[10px] uppercase text-dim" style={{ letterSpacing: '.12em' }}>
                  consigliato
                </span>
                <Numero valore={prezzoConsigliato(c.quotazioneBase, config)} dimensione={30} />
              </span>
            </button>
          );
        })}
      </div>

      {scelto && (
        <div className="flex items-start gap-[26px]">
          <div>
            <div className="mb-[4px] text-[10px] uppercase text-dim" style={{ letterSpacing: '.14em' }}>
              La tua offerta
            </div>
            <input
              ref={campoOfferta}
              value={offerta}
              onChange={(e) => setOfferta(e.target.value.replace(/[^0-9]/g, ''))}
              onKeyDown={tasti}
              placeholder={String(consigliato)}
              inputMode="numeric"
              aria-label="Offerta"
              className="n rounded-[12px] text-center font-bold outline-none"
              style={{
                width: 190,
                background: 'rgba(0,0,0,.45)',
                border: `2px solid ${coloreBordo}`,
                padding: '10px 14px',
                fontSize: 56,
              }}
            />
          </div>

          {sim && (
            <div className="flex flex-col gap-[7px] pt-[20px]">
              <div className="flex items-end gap-[26px]">
                <Blocco etichetta="residui dopo" valore={sim.residuiDopo} colore={sim.residuiDopo < 0 ? 'var(--color-danger)' : undefined} />
                <Blocco etichetta="max offerta dopo" valore={sim.maxOffertaDopo} colore="var(--color-gold)" />
              </div>
              <div className="flex flex-wrap gap-[20px] text-[13px] text-dim">
                <span>
                  slot rimasti <b className="n text-chalk">{sim.slotDopo}</b>
                  {sim.medioPerSlot !== null && <> · <b className="n text-chalk">{sim.medioPerSlot}</b> cr/slot</>}
                </span>
                <span>
                  budget {scelto.ruolo} dopo{' '}
                  <b className="n" style={{ color: sim.sforaQuotaRuolo ? 'var(--color-amber)' : 'var(--color-chalk)' }}>
                    {sim.residuoRuoloDopo}
                  </b>
                </span>
                <span>{formattaScostamento(sim.scostamentoPerc)}</span>
              </div>
              {sim.avviso && (
                <p
                  className="text-[15px] font-bold"
                  style={{ color: sim.gravita === 'blocco' ? 'var(--color-danger)' : 'var(--color-amber)' }}
                >
                  {sim.avviso}
                </p>
              )}
            </div>
          )}

          {rilanci && (
            <div
              className="ml-auto rounded-[10px] border border-line px-[16px] py-[12px]"
              style={{ background: 'rgba(0,0,0,.25)', minWidth: 230 }}
            >
              <div className="text-[10px] uppercase text-dim" style={{ letterSpacing: '.12em' }}>
                Possono rilanciare
              </div>
              <Numero valore={`${rilanci.possono.length}/${rilanci.totale}`} dimensione={48} />
              <p className="mt-[4px] text-[12px] leading-[1.5] text-dim">
                {rilanci.possono.length === 0
                  ? 'nessuno ha la capienza'
                  : rilanci.possono.map((a) => a.nome).join(', ')}
              </p>
            </div>
          )}
        </div>
      )}

      <div className="mt-auto flex gap-[12px]">
        {sceltaAvversario && scelto ? (
          <SelettoreAvversario
            nomeCalciatore={scelto.nome}
            avversari={avversari}
            onScegli={confermaAvversario}
          />
        ) : (
          <>
            <Azione etichetta="Preso io" tasto="Invio" sfondo="var(--color-ok)" colore="#08160F" onClick={() => fai('preso')} disabilitato={!scelto} />
            <Azione etichetta="Preso da un avversario" tasto="V" bordo="var(--color-danger)" colore="var(--color-danger)" onClick={apriSceltaAvversario} disabilitato={!scelto} />
            <Azione etichetta="Scarta" tasto="S" bordo="var(--color-line)" colore="var(--color-dim)" onClick={() => fai('scarta')} disabilitato={!scelto} />
            <Azione etichetta="Annulla ultima" tasto="Ctrl+Z" bordo="var(--color-line)" colore="var(--color-dim)" onClick={annulla} />
          </>
        )}
      </div>

      <footer className="flex items-center justify-between text-[12px] text-dim">
        <span>
          {sceltaAvversario
            ? '1-9 scelgono la squadra · Invio = non lo so · Esc annulla la scelta'
            : '↑↓ scorre i risultati · Tab porta al campo offerta · Esc svuota, poi esce'}
        </span>
        <span>
          {eventi[0] ? (
            <>
              ultima azione:{' '}
              <b style={{ color: eventi[0].automatico ? 'var(--color-gold)' : 'var(--color-chalk)' }}>
                {eventi[0].testo}
              </b>
            </>
          ) : (
            'nessuna azione registrata'
          )}
        </span>
      </footer>
    </div>
  );
}

function Blocco({ etichetta, valore, colore }: { etichetta: string; valore: number; colore?: string }) {
  return (
    <span>
      <span className="block text-[10px] uppercase text-dim" style={{ letterSpacing: '.12em' }}>
        {etichetta}
      </span>
      <Numero valore={valore} dimensione={26} colore={colore} />
    </span>
  );
}

/**
 * Selettore rapido di squadra: sostituisce la riga dei pulsanti quando premo
 * V. Un numero sceglie la squadra (fino a 9, il massimo comodo da tastiera),
 * Invio vale "non lo so" — il calciatore esce comunque dal mercato — Esc
 * annulla e torna alle quattro azioni normali senza registrare nulla.
 */
function SelettoreAvversario({
  nomeCalciatore,
  avversari,
  onScegli,
}: {
  nomeCalciatore: string;
  avversari: AvversarioCalcolato[];
  onScegli: (id: string | null) => void;
}) {
  const numerabili = avversari.slice(0, 9);
  const resto = avversari.length - numerabili.length;

  return (
    <div
      className="flex-1 rounded-[12px] border-2 px-[20px] py-[16px]"
      style={{ borderColor: 'var(--color-danger)', background: 'rgba(194,75,63,.08)' }}
    >
      <div
        className="mb-[10px] text-[14px] font-bold uppercase"
        style={{ color: 'var(--color-danger)', letterSpacing: '.06em' }}
      >
        {nomeCalciatore} → a chi è andato?
      </div>
      <div className="flex flex-wrap gap-[8px]">
        {numerabili.map((a, i) => (
          <button
            key={a.id}
            type="button"
            onClick={() => onScegli(a.id)}
            className="flex items-center gap-[8px] rounded-[8px] border border-line px-[12px] py-[8px] text-[14px]"
            style={{ background: 'rgba(0,0,0,.3)' }}
          >
            <span
              className="n rounded-[4px] px-[6px] py-[2px] text-[11px] font-bold"
              style={{ background: 'var(--color-danger)', color: 'var(--color-chalk)' }}
            >
              {i + 1}
            </span>
            {a.nome}
            <span className="n text-[11px] text-dim">max {a.maxOfferta}</span>
          </button>
        ))}
        <button
          type="button"
          onClick={() => onScegli(null)}
          className="flex items-center gap-[8px] rounded-[8px] border border-line px-[12px] py-[8px] text-[14px] text-dim"
        >
          <span className="n rounded-[4px] border border-line px-[6px] py-[2px] text-[11px] font-bold">
            Invio
          </span>
          Non lo so
        </button>
      </div>
      <p className="mt-[9px] text-[11px] text-dim">
        Premi il numero della squadra · Invio per «non lo so» · Esc per annullare
        {resto > 0 && ` · altre ${resto} squadre selezionabili solo col mouse`}
      </p>
    </div>
  );
}

function Azione({
  etichetta,
  tasto,
  sfondo,
  bordo,
  colore,
  onClick,
  disabilitato,
}: {
  etichetta: string;
  tasto: string;
  sfondo?: string;
  bordo?: string;
  colore: string;
  onClick: () => void;
  disabilitato?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabilitato}
      className="flex flex-1 items-center justify-center gap-[10px] rounded-[12px] px-[16px] py-[22px] disabled:opacity-40"
      style={{ background: sfondo ?? 'transparent', border: `1px solid ${bordo ?? sfondo}`, color: colore }}
    >
      <span className="text-[22px] font-extrabold">{etichetta}</span>
      <span className="text-[13px] opacity-80">{tasto}</span>
    </button>
  );
}
