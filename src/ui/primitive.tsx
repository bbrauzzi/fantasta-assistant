/* Primitive visive della direzione "Campo". Componenti piccoli e senza logica:
   servono a non ripetere raggi, bordi e spaziature in venti punti diversi. */

import type { ReactNode, CSSProperties, ComponentProps } from 'react';
import type { Fascia, Ruolo } from '../types';
import { FASCIA_COLORE, RUOLO_COLORE } from '../domain/costanti';

/* ------------------------------ pannelli ------------------------------ */

export function Pannello({
  titolo,
  azione,
  children,
  className = '',
  style,
}: {
  titolo?: string;
  azione?: ReactNode;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <section
      className={`rounded-[11px] border border-line bg-panel p-[13px] ${className}`}
      style={style}
    >
      {(titolo || azione) && (
        <header className="mb-[9px] flex items-center justify-between gap-2">
          {titolo && <h2 className="titolo-pannello">{titolo}</h2>}
          {azione}
        </header>
      )}
      {children}
    </section>
  );
}

/** Nota di lettura in fondo a un pannello: spiega come si legge il dato. */
export function Nota({ children, tono = 'dim' }: { children: ReactNode; tono?: 'dim' | 'amber' }) {
  return (
    <p
      className={`mt-[9px] text-[10px] leading-[1.5] ${tono === 'amber' ? 'text-amber' : 'text-dim'}`}
    >
      {children}
    </p>
  );
}

/* ------------------------------- badge ------------------------------- */

export function BadgeRuolo({ ruolo, dimensione = 22 }: { ruolo: Ruolo; dimensione?: number }) {
  return (
    <span
      className="grid place-items-center rounded-[5px] font-extrabold text-ink"
      style={{
        width: dimensione,
        height: dimensione,
        background: RUOLO_COLORE[ruolo],
        fontSize: Math.round(dimensione * 0.5),
      }}
      title={ruolo}
    >
      {ruolo}
    </span>
  );
}

export function BadgeFascia({ fascia, piccolo = true }: { fascia: Fascia; piccolo?: boolean }) {
  return (
    <span
      className="inline-block rounded-[5px] border px-[6px] py-[2px] text-center font-bold uppercase"
      style={{
        color: FASCIA_COLORE[fascia],
        borderColor: FASCIA_COLORE[fascia],
        fontSize: piccolo ? 9 : 11,
        letterSpacing: '.02em',
      }}
    >
      {fascia}
    </span>
  );
}

/**
 * Fascia come pallino, non come badge: nelle colonne strette (obiettivi,
 * panchina) l'etichetta a tutta parola mandava le righe a capo.
 */
export function PallinoFascia({ fascia }: { fascia: Fascia }) {
  return (
    <span
      className="shrink-0 rounded-full"
      style={{ width: 7, height: 7, background: FASCIA_COLORE[fascia] }}
      title={fascia}
      aria-label={fascia}
    />
  );
}

/**
 * RIG in oro pieno = tira i rigori. RIG in ambra col punto di domanda = le
 * fonti non concordano su chi tira: l'incertezza va vista, non nascosta.
 */
export function BadgeRig({
  grande = false,
  incerto = false,
}: {
  grande?: boolean;
  incerto?: boolean;
}) {
  return (
    <span
      className="whitespace-nowrap font-extrabold"
      style={{
        fontSize: grande ? 12 : 10,
        color: incerto ? 'var(--color-amber)' : 'var(--color-gold)',
      }}
      title={
        incerto
          ? 'Candidato dal dischetto, ma le fonti non concordano: gerarchia da confermare'
          : 'Tira i rigori'
      }
    >
      RIG{incerto ? '?' : ''}
    </span>
  );
}

/** Batte le punizioni: piu' occasioni di gol e di assist. */
export function BadgePunizioni({ grande = false }: { grande?: boolean }) {
  return (
    <span
      className="whitespace-nowrap font-extrabold text-dim"
      style={{ fontSize: grande ? 12 : 10 }}
      title="Batte le punizioni"
    >
      PUN
    </span>
  );
}

/* ------------------------------ pulsanti ------------------------------ */

type VarPulsante = 'oro' | 'ok' | 'danger' | 'fantasma' | 'dim';

const STILI: Record<VarPulsante, string> = {
  oro: 'bg-gold text-ink border border-gold',
  ok: 'bg-ok text-[#08160F] border border-ok',
  danger: 'border border-line text-danger bg-transparent',
  fantasma: 'border border-line text-chalk bg-transparent',
  dim: 'border border-line text-dim bg-transparent',
};

export function Pulsante({
  variante = 'fantasma',
  className = '',
  ...props
}: ComponentProps<'button'> & { variante?: VarPulsante }) {
  return (
    <button
      type="button"
      className={`rounded-[8px] px-[14px] py-[8px] text-[12px] font-bold disabled:opacity-40 ${STILI[variante]} ${className}`}
      {...props}
    />
  );
}

/** Pulsante compatto delle azioni di riga. */
export function MiniPulsante({
  variante = 'dim',
  className = '',
  ...props
}: ComponentProps<'button'> & { variante?: VarPulsante }) {
  return (
    <button
      type="button"
      className={`rounded-[5px] px-[8px] py-[5px] text-[10px] font-extrabold ${STILI[variante]} ${className}`}
      {...props}
    />
  );
}

/* -------------------------------- campi -------------------------------- */

export function Campo({ className = '', ...props }: ComponentProps<'input'>) {
  return (
    <input
      className={`rounded-[8px] border border-line bg-panel-input px-[12px] py-[8px] text-[13px] placeholder:text-dim ${className}`}
      {...props}
    />
  );
}

export function Selezione({
  className = '',
  children,
  ...props
}: ComponentProps<'select'>) {
  return (
    <select
      className={`rounded-[8px] border border-line bg-panel-input px-[10px] py-[8px] text-[12px] ${className}`}
      {...props}
    >
      {children}
    </select>
  );
}

/* ------------------------------ numeri ------------------------------ */

export function Numero({
  valore,
  dimensione = 13,
  colore,
  peso = 700,
  suffisso,
  className = '',
}: {
  valore: number | string;
  dimensione?: number;
  colore?: string;
  peso?: number;
  suffisso?: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`n whitespace-nowrap ${className}`}
      style={{ fontSize: dimensione, color: colore, fontWeight: peso, lineHeight: 1.05 }}
    >
      {valore}
      {suffisso}
    </span>
  );
}

/** Barra di avanzamento alta 3px usata nei box di ruolo. */
export function BarraAvanzamento({
  perc,
  colore,
  altezza = 3,
}: {
  perc: number;
  colore: string;
  altezza?: number;
}) {
  return (
    <div
      className="mt-[4px] w-full overflow-hidden rounded-[2px]"
      style={{ height: altezza, background: 'rgba(244,240,230,.14)' }}
    >
      <div
        style={{
          height: '100%',
          width: `${Math.max(0, Math.min(100, perc))}%`,
          background: colore,
          borderRadius: 2,
        }}
      />
    </div>
  );
}

/** Chip con etichetta e valore, usato nelle fasce di simulazione. */
export function Dato({
  etichetta,
  children,
  colore,
}: {
  etichetta: string;
  children: ReactNode;
  colore?: string;
}) {
  return (
    <span className="whitespace-nowrap text-dim">
      {etichetta}{' '}
      <b className="n font-bold" style={{ color: colore ?? 'var(--color-chalk)' }}>
        {children}
      </b>
    </span>
  );
}
