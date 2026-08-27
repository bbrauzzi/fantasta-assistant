/* Una riga del listone + la fascia di simulazione che si apre SOTTO la riga
   (non un tooltip che copre le righe successive: spinge in basso le altre). */

import { memo, useEffect, useRef, type CSSProperties } from 'react';
import { Pencil, Star, X } from 'lucide-react';
import type { Calciatore } from '../types';
import type { StatoBudget } from '../domain/budget';
import { formattaScostamento, prezzoConsigliato, simulaOfferta } from '../domain/budget';
import { chiPuoRilanciare, type AvversarioCalcolato } from '../domain/avversari';
import { FASCIA_COLORE, RUOLO_COLORE, SOGLIA_TITOLARITA_DEBOLE } from '../domain/costanti';
import { useStore } from '../store/store';
import { useUI, type Tema } from '../store/ui';
import {
  BadgeFascia,
  BadgePunizioni,
  BadgeRig,
  BadgeRuolo,
  Dato,
  MiniPulsante,
  Numero,
} from '../ui/primitive';
import { ModificaRiga } from './ModificaRiga';

export const GRIGLIA_CAMPO = '34px 1fr 104px 84px 62px 50px 68px 26px 250px';
export const GRIGLIA_GRAFITE = '20px minmax(150px,1fr) 96px 92px 56px 46px 58px 22px 244px';
/** @deprecated usare {@link griglia} */
export const GRIGLIA = GRIGLIA_CAMPO;

export function griglia(tema: Tema): string {
  return tema === 'grafite' ? GRIGLIA_GRAFITE : GRIGLIA_CAMPO;
}

/** Fondo della riga secondo lo stato: il colore porta significato. */
function fondoRiga(c: Calciatore): string | undefined {
  switch (c.stato) {
    case 'obiettivo':
      return 'rgba(212,175,55,.07)';
    case 'acquistato':
      return 'rgba(78,156,110,.14)';
    case 'perso':
      return 'rgba(194,75,63,.10)';
    case 'scartato':
      return 'rgba(0,0,0,.30)';
    default:
      return undefined;
  }
}

function coloreAvviso(gravita: 'nessuno' | 'attenzione' | 'blocco'): string {
  if (gravita === 'blocco') return 'var(--color-danger)';
  if (gravita === 'attenzione') return 'var(--color-amber)';
  return 'var(--color-line)';
}

/** Fondo della riga nel tema Grafite: appena percettibile, niente tinte piene. */
function fondoRigaGrafite(stato: Calciatore['stato']): string {
  if (stato === 'obiettivo') return 'color-mix(in srgb, var(--color-gold) 4%, transparent)';
  if (stato === 'acquistato') return 'color-mix(in srgb, var(--color-ok) 7%, transparent)';
  return 'transparent';
}

/** Marcatore a filo nel tema Grafite: sostituisce il fondo pieno come segnale di stato. */
function marcatoreGrafite(stato: Calciatore['stato']): string {
  if (stato === 'obiettivo') return 'inset 3px 0 0 var(--color-gold)';
  if (stato === 'acquistato') return 'inset 3px 0 0 var(--color-ok)';
  if (stato === 'perso') return 'inset 3px 0 0 #4A3A36';
  return 'none';
}

export const RigaListone = memo(function RigaListone({
  calciatore: c,
  st,
  avversari,
  selezionata,
  lampeggia,
  inModifica,
}: {
  calciatore: Calciatore;
  st: StatoBudget;
  avversari: AvversarioCalcolato[];
  selezionata: boolean;
  lampeggia: boolean;
  inModifica: boolean;
}) {
  const tema = useUI((s) => s.tema);
  const config = useStore((s) => s.config);
  const acquista = useStore((s) => s.acquista);
  const scarta = useStore((s) => s.scarta);
  const ripristina = useStore((s) => s.ripristinaDisponibile);
  const alternaObiettivo = useStore((s) => s.alternaObiettivo);

  const bozza = useUI((s) => s.bozze[c.id] ?? '');
  const setBozza = useUI((s) => s.setBozza);
  const pulisciBozza = useUI((s) => s.pulisciBozza);
  const seleziona = useUI((s) => s.seleziona);
  const setModale = useUI((s) => s.setModale);
  const apriModifica = useUI((s) => s.apriModifica);

  const rif = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (selezionata) rif.current?.scrollIntoView({ block: 'nearest' });
  }, [selezionata]);

  const consigliato = prezzoConsigliato(c.quotazioneBase, config);
  const offerta = bozza === '' ? null : Number(bozza);
  const sim =
    offerta !== null && Number.isFinite(offerta)
      ? simulaOfferta(offerta, c.ruolo, c.quotazioneBase, st, config)
      : null;
  const rilanci = sim ? chiPuoRilanciare(avversari, sim.offerta, c.ruolo) : null;

  const conferma = () => {
    if (offerta === null || !Number.isFinite(offerta)) return;
    if (sim?.richiedeConferma) {
      // lo sforo del budget totale e' quasi sempre un errore di battitura:
      // qui e solo qui serve una seconda conferma
      setModale({
        tipo: 'conferma-acquisto',
        calciatore: c,
        prezzo: offerta,
        motivo: sim.avviso ?? '',
      });
      return;
    }
    acquista(c.id, offerta);
    pulisciBozza(c.id);
  };

  const bordoOfferta = sim ? coloreAvviso(sim.gravita) : 'var(--color-line)';

  if (tema === 'grafite') {
    const cellaSim: CSSProperties = {
      padding: '9px 18px',
      borderLeft: '1px solid var(--color-line)',
      fontSize: 11,
      color: '#A8A8A8',
    };
    const btnAnnulla: CSSProperties = {
      padding: '4px 8px',
      fontSize: 10,
      fontWeight: 600,
      border: '1px solid var(--color-line)',
      color: '#A8A8A8',
      background: 'transparent',
      cursor: 'pointer',
    };
    const obiettivo = c.stato === 'obiettivo';

    return (
      <div
        ref={rif}
        onClick={() => seleziona(c.id)}
        data-riga={c.id}
        data-selezionata={selezionata || undefined}
        className={lampeggia ? 'lampeggia' : undefined}
        style={{
          borderBottom: '1px solid rgba(255,255,255,.07)',
          background: fondoRigaGrafite(c.stato),
          boxShadow: marcatoreGrafite(c.stato),
        }}
      >
        <div
          className="grid items-center gap-[10px] px-[18px] py-[8px] text-[13px]"
          style={{
            gridTemplateColumns: griglia(tema),
            opacity: c.stato === 'perso' ? 0.5 : c.stato === 'scartato' ? 0.38 : 1,
          }}
        >
          <span className="n" style={{ fontSize: 11, fontWeight: 700, color: RUOLO_COLORE[c.ruolo] }}>
            {c.ruolo}
          </span>
          <span className="flex min-w-0 items-center gap-[8px]">
            <span
              className="truncate font-semibold"
              style={{ textDecoration: c.stato === 'perso' ? 'line-through' : undefined }}
              title={c.note || undefined}
            >
              {c.nome}
            </span>
            {obiettivo && (
              <span
                className="whitespace-nowrap font-bold uppercase"
                style={{ fontSize: 9, letterSpacing: '.1em', color: 'var(--color-gold)' }}
              >
                obiettivo
              </span>
            )}
            {c.daRivedere && !c.daRivedere.visto && (
              <span className="whitespace-nowrap text-[9px] font-bold text-amber" title={c.daRivedere.dettaglio}>
                ⚠ da rivedere
              </span>
            )}
          </span>
          <span className="truncate" style={{ fontSize: 12, color: '#A8A8A8' }}>
            {c.squadra}
          </span>
          <span className="flex items-center gap-[6px]" style={{ fontSize: 11, color: '#C4C4C4' }}>
            <span
              className="shrink-0 rounded-full"
              style={{ width: 5, height: 5, background: FASCIA_COLORE[c.fascia] }}
            />
            {c.fascia}
          </span>
          <span className="flex items-baseline gap-[5px]" style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.06em' }}>
            {c.rigorista && (
              <span
                className="whitespace-nowrap"
                style={{ color: c.rigoristaIncerto ? 'var(--color-amber)' : 'var(--color-gold)' }}
              >
                RIG{c.rigoristaIncerto ? '?' : ''}
              </span>
            )}
            {c.tiratorePunizioni && (
              <span className="whitespace-nowrap" style={{ color: '#8F8F8F' }}>
                PUN
              </span>
            )}
          </span>
          <span
            className="n"
            style={{
              textAlign: 'right',
              fontSize: 12,
              color: c.probTitolare < SOGLIA_TITOLARITA_DEBOLE ? 'var(--color-amber)' : '#C4C4C4',
            }}
          >
            {c.probTitolare}%
          </span>
          <span className="n" style={{ textAlign: 'right', fontSize: 13, fontWeight: 600 }}>
            {consigliato}
          </span>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              apriModifica(c.id);
            }}
            title="Modifica squadra, fascia, titolarità, quotazione, note"
            aria-label={`Modifica ${c.nome}`}
            style={{ padding: 3, color: inModifica ? 'var(--color-gold)' : '#6A6A6A', background: 'transparent', border: 'none', cursor: 'pointer' }}
          >
            <Pencil size={11} />
          </button>

          <div className="flex items-center justify-end gap-[6px]">
            {c.stato === 'acquistato' ? (
              <>
                <span className="whitespace-nowrap" style={{ fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--color-ok)' }}>
                  tuo
                </span>
                <span className="n" style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-ok)' }}>
                  {c.prezzoPagato}
                </span>
                <button type="button" style={btnAnnulla} onClick={() => useStore.getState().annullaAcquisto(c.id)}>
                  Annulla
                </button>
              </>
            ) : c.stato === 'perso' ? (
              <>
                <span className="whitespace-nowrap" style={{ fontSize: 11, color: '#8F8F8F' }}>
                  {c.acquirenteId
                    ? (useStore.getState().avversari.find((a) => a.id === c.acquirenteId)?.nome ??
                      'avversario')
                    : 'avversario'}
                  {c.prezzoDiMercato !== null ? ` · ${c.prezzoDiMercato}` : ''}
                </span>
                <button type="button" style={btnAnnulla} onClick={() => ripristina(c.id)}>
                  Annulla
                </button>
              </>
            ) : (
              <>
                <input
                  value={bozza}
                  onChange={(e) => setBozza(c.id, e.target.value.replace(/[^0-9-]/g, ''))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') conferma();
                    if (e.key === 'Escape') pulisciBozza(c.id);
                  }}
                  onFocus={() => seleziona(c.id)}
                  placeholder={String(consigliato)}
                  inputMode="numeric"
                  aria-label={`Offerta per ${c.nome}`}
                  data-offerta={c.id}
                  className="n"
                  style={{
                    width: 52,
                    padding: '4px 8px',
                    textAlign: 'right',
                    fontSize: 13,
                    background: 'var(--color-panel-input)',
                    border: `1px solid ${bordoOfferta}`,
                    color: 'var(--color-chalk)',
                    outline: 'none',
                  }}
                />
                <button
                  type="button"
                  onClick={conferma}
                  title="Preso da me (A)"
                  style={{ padding: '5px 10px', fontSize: 10, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', background: '#2C352E', color: '#9CBFA2', border: '1px solid #41544A', cursor: 'pointer' }}
                >
                  Preso
                </button>
                <button
                  type="button"
                  onClick={() => alternaObiettivo(c.id)}
                  title="Obiettivo (O)"
                  style={{
                    padding: '5px 7px',
                    border: `1px solid ${obiettivo ? 'var(--color-gold)' : 'var(--color-line)'}`,
                    background: obiettivo ? 'color-mix(in srgb, var(--color-gold) 14%, transparent)' : 'transparent',
                    color: obiettivo ? 'var(--color-gold)' : '#6A6A6A',
                    cursor: 'pointer',
                  }}
                >
                  <Star size={11} fill={obiettivo ? 'currentColor' : 'none'} />
                </button>
                <button
                  type="button"
                  onClick={() => setModale({ tipo: 'assegna', calciatore: c })}
                  title="Preso da un avversario (V)"
                  style={{ padding: '5px 8px', fontSize: 10, fontWeight: 700, letterSpacing: '.06em', border: '1px solid var(--color-line)', color: 'var(--color-danger)', background: 'transparent', cursor: 'pointer' }}
                >
                  VS
                </button>
                <button
                  type="button"
                  onClick={() => (c.stato === 'scartato' ? ripristina(c.id) : scarta(c.id))}
                  title="Scarta (S)"
                  style={{ padding: '5px 7px', border: '1px solid var(--color-line)', color: '#8F8F8F', background: 'transparent', cursor: 'pointer' }}
                >
                  <X size={11} />
                </button>
              </>
            )}
          </div>
        </div>

        {inModifica && <ModificaRiga calciatore={c} />}

        {sim && (
          <div
            className="flex flex-wrap items-center"
            style={{ gap: 0, padding: '0 18px 0 48px', background: 'var(--color-pitch-deep)', borderTop: '1px solid var(--color-line-soft)' }}
          >
            <span style={{ padding: '9px 18px 9px 0', fontSize: 10, textTransform: 'uppercase', letterSpacing: '.14em', color: '#8F8F8F' }}>
              Se offri {offerta}
            </span>
            <span style={cellaSim}>
              residui{' '}
              <b className="n" style={{ fontSize: 13, color: sim.residuiDopo < 0 ? 'var(--color-danger)' : 'var(--color-chalk)' }}>
                {sim.residuiDopo}
              </b>
            </span>
            <span style={cellaSim}>
              max offerta <b className="n" style={{ fontSize: 13, color: 'var(--color-gold)' }}>{sim.maxOffertaDopo}</b>
            </span>
            <span style={cellaSim}>
              budget {c.ruolo}{' '}
              <b className="n" style={{ fontSize: 13, color: sim.sforaQuotaRuolo ? 'var(--color-amber)' : 'var(--color-chalk)' }}>
                {sim.residuoRuoloDopo}
              </b>
            </span>
            <span style={cellaSim}>
              slot{' '}
              <b className="n" style={{ fontSize: 13, color: 'var(--color-chalk)' }}>
                {sim.slotDopo}
                {sim.medioPerSlot !== null && (
                  <span className="font-normal" style={{ color: '#A8A8A8' }}> · {sim.medioPerSlot} cr/slot</span>
                )}
              </b>
            </span>
            <span style={{ ...cellaSim, color: 'var(--color-amber)', fontWeight: 600 }}>
              {formattaScostamento(sim.scostamentoPerc)}
            </span>
            {rilanci && (
              <span style={cellaSim}>
                possono rilanciare{' '}
                <b className="n" style={{ fontSize: 13, color: 'var(--color-chalk)' }}>
                  {rilanci.possono.length}/{rilanci.totale}
                </b>
              </span>
            )}
            {sim.avviso && (
              <span style={{ ...cellaSim, fontWeight: 700, color: sim.gravita === 'blocco' ? 'var(--color-danger)' : 'var(--color-amber)' }}>
                {sim.avviso}
              </span>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      ref={rif}
      onClick={() => seleziona(c.id)}
      data-riga={c.id}
      data-selezionata={selezionata || undefined}
      className={lampeggia ? 'lampeggia' : undefined}
      style={{
        borderTop: '1px solid var(--color-line-soft)',
        background: fondoRiga(c),
        borderLeft: selezionata ? '3px solid #D4AF37' : '3px solid transparent',
      }}
    >
      <div
        className="grid items-center gap-[10px] px-[12px] py-[8px] text-[13px]"
        style={{
          gridTemplateColumns: griglia(tema),
          opacity: c.stato === 'perso' ? 0.62 : c.stato === 'scartato' ? 0.5 : 1,
        }}
      >
        <BadgeRuolo ruolo={c.ruolo} />
        <b
          className="truncate font-bold"
          style={{ textDecoration: c.stato === 'perso' ? 'line-through' : undefined }}
          title={c.note || undefined}
        >
          {c.nome}
          {c.daRivedere && !c.daRivedere.visto && (
            <span className="ml-[6px] text-[9px] font-bold text-amber" title={c.daRivedere.dettaglio}>
              ⚠ da rivedere
            </span>
          )}
        </b>
        <span className="truncate text-[12px] text-dim">{c.squadra}</span>
        <BadgeFascia fascia={c.fascia} />
        <span className="flex items-baseline gap-[4px]">
          {c.rigorista && <BadgeRig incerto={c.rigoristaIncerto} />}
          {c.tiratorePunizioni && <BadgePunizioni />}
        </span>
        <Numero
          valore={`${c.probTitolare}%`}
          dimensione={12}
          peso={500}
          colore={c.probTitolare < SOGLIA_TITOLARITA_DEBOLE ? 'var(--color-amber)' : undefined}
        />
        <Numero valore={consigliato} dimensione={13} />

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            apriModifica(c.id);
          }}
          title="Modifica squadra, fascia, titolarità, quotazione, note"
          aria-label={`Modifica ${c.nome}`}
          className="rounded-[4px] p-[3px]"
          style={{ color: inModifica ? 'var(--color-gold)' : 'var(--color-dim)' }}
        >
          <Pencil size={11} />
        </button>

        <div className="flex items-center justify-end gap-[5px]">
          {c.stato === 'acquistato' ? (
            <>
              <span className="n text-[12px] font-bold text-ok">preso a {c.prezzoPagato}</span>
              <MiniPulsante onClick={() => useStore.getState().annullaAcquisto(c.id)}>
                Annulla
              </MiniPulsante>
            </>
          ) : c.stato === 'perso' ? (
            <>
              <span className="text-[11px] text-dim">
                {c.acquirenteId
                  ? (useStore.getState().avversari.find((a) => a.id === c.acquirenteId)?.nome ??
                    'avversario')
                  : 'avversario'}
                {c.prezzoDiMercato !== null ? ` · ${c.prezzoDiMercato}` : ''}
              </span>
              <MiniPulsante onClick={() => ripristina(c.id)}>Annulla</MiniPulsante>
            </>
          ) : (
            <>
              <input
                value={bozza}
                onChange={(e) => setBozza(c.id, e.target.value.replace(/[^0-9-]/g, ''))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') conferma();
                  if (e.key === 'Escape') pulisciBozza(c.id);
                }}
                onFocus={() => seleziona(c.id)}
                placeholder={String(consigliato)}
                inputMode="numeric"
                aria-label={`Offerta per ${c.nome}`}
                data-offerta={c.id}
                className="n rounded-[5px] px-[9px] py-[4px] text-center text-[12px]"
                style={{
                  width: 50,
                  background: 'rgba(0,0,0,.35)',
                  border: `1px solid ${bordoOfferta}`,
                  color: bozza ? 'var(--color-chalk)' : undefined,
                }}
              />
              <MiniPulsante variante="ok" onClick={conferma} title="Preso da me (A)">
                Preso
              </MiniPulsante>
              <MiniPulsante
                variante={c.stato === 'obiettivo' ? 'oro' : 'dim'}
                onClick={() => alternaObiettivo(c.id)}
                title="Obiettivo (O)"
              >
                <Star size={11} fill={c.stato === 'obiettivo' ? 'currentColor' : 'none'} />
              </MiniPulsante>
              <MiniPulsante
                variante="danger"
                onClick={() => setModale({ tipo: 'assegna', calciatore: c })}
                title="Preso da un avversario (V)"
              >
                VS
              </MiniPulsante>
              <MiniPulsante
                onClick={() => (c.stato === 'scartato' ? ripristina(c.id) : scarta(c.id))}
                title="Scarta (S)"
              >
                <X size={11} />
              </MiniPulsante>
            </>
          )}
        </div>
      </div>

      {inModifica && <ModificaRiga calciatore={c} />}

      {/* F6 - simulazione live: ricalcolata a ogni carattere digitato */}
      {sim && (
        <div
          className="flex flex-wrap items-center gap-[22px] px-[12px] py-[8px] pb-[10px] pl-[60px] text-[11px]"
          style={{ background: 'rgba(0,0,0,.20)', borderTop: '1px solid rgba(244,240,230,.05)' }}
        >
          <Dato
            etichetta="residui dopo"
            colore={sim.residuiDopo < 0 ? 'var(--color-danger)' : undefined}
          >
            {sim.residuiDopo}
          </Dato>
          <Dato etichetta="max offerta dopo" colore="var(--color-gold)">
            {sim.maxOffertaDopo}
          </Dato>
          <Dato
            etichetta={`budget ${c.ruolo} dopo`}
            colore={sim.sforaQuotaRuolo ? 'var(--color-amber)' : undefined}
          >
            {sim.residuoRuoloDopo}
          </Dato>
          <Dato etichetta="slot rimasti">
            {sim.slotDopo}
            {sim.medioPerSlot !== null && (
              <span className="font-normal text-dim"> · {sim.medioPerSlot} cr/slot</span>
            )}
          </Dato>
          <Dato etichetta="">{formattaScostamento(sim.scostamentoPerc)}</Dato>
          {rilanci && (
            <Dato etichetta="possono rilanciare">
              {rilanci.possono.length}/{rilanci.totale}
            </Dato>
          )}
          {sim.avviso && (
            <span
              className="font-bold"
              style={{ color: sim.gravita === 'blocco' ? 'var(--color-danger)' : 'var(--color-amber)' }}
            >
              {sim.avviso}
            </span>
          )}
        </div>
      )}
    </div>
  );
});
