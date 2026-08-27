/* F15 - copertura per modulo e vista campo.
   Deve stare tutto in uno schermo a 1280×720 senza scorrere. */

import { useMemo, useState } from 'react';
import { RUOLI, RUOLO_COLORE, SOGLIA_TITOLARITA_DEBOLE } from '../domain/costanti';
import { etichettaDeficit, frasiGuadagno, type FormazioneModulo } from '../domain/moduli';
import { useModuli } from '../store/derivati';
import { BadgeRig, Nota, Numero, Pannello } from '../ui/primitive';

/* i reparti si disegnano dall'attacco alla porta, come si guarda una formazione */
const ORDINE_CAMPO = ['A', 'C', 'D', 'P'] as const;

export function Moduli() {
  const { formazioni, guadagni } = useModuli();
  const [scelto, setScelto] = useState<string | null>(null);

  const attiva = useMemo(
    () => formazioni.find((f) => f.modulo.nome === scelto) ?? formazioni[0],
    [formazioni, scelto],
  );
  const constatazione = frasiGuadagno(guadagni);

  return (
    /* La vista deve stare in uno schermo a 1280x720 senza scorrere: fisso
       l'altezza allo spazio sotto barra di stato e navigazione, e faccio
       scorrere la colonna dei moduli dentro se stessa. */
    <div
      className="grid gap-[18px] overflow-hidden px-[18px] py-[16px]"
      style={{ gridTemplateColumns: '290px 1fr', height: 'calc(100vh - var(--altezza-testata))' }}
    >
      <div className="flex min-h-0 flex-col gap-[12px] overflow-y-auto pr-[4px]">
        <Pannello titolo="Copertura per modulo">
          <ul className="flex flex-col gap-[3px]">
            {formazioni.map((f) => {
              const selezionato = f.modulo.nome === attiva?.modulo.nome;
              const deficit = etichettaDeficit(f);
              return (
                <li key={f.modulo.nome}>
                  <button
                    type="button"
                    onClick={() => setScelto(f.modulo.nome)}
                    className="flex w-full items-center gap-[9px] rounded-[7px] px-[9px] py-[7px] text-left"
                    style={{
                      border: `1px solid ${selezionato ? 'var(--color-gold)' : 'transparent'}`,
                      background: selezionato ? 'rgba(212,175,55,.12)' : undefined,
                    }}
                  >
                    <b className="w-[52px] shrink-0 text-[12px] font-bold">{f.modulo.nome}</b>
                    <span
                      className="h-[5px] flex-1 overflow-hidden rounded-[3px]"
                      style={{ background: 'rgba(244,240,230,.14)' }}
                    >
                      <span
                        className="block h-full rounded-[3px]"
                        style={{
                          width: `${f.copertura}%`,
                          background: f.completo ? 'var(--color-ok)' : 'var(--color-amber)',
                        }}
                      />
                    </span>
                    {deficit ? (
                      <span className="n w-[58px] shrink-0 whitespace-nowrap text-right text-[11px] font-bold text-amber">
                        {deficit}
                      </span>
                    ) : (
                      <Numero valore={`${f.copertura}%`} dimensione={11} peso={500} className="w-[58px] text-right" />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
          {constatazione && (
            <p
              className="mt-[10px] border-t border-line pt-[9px] text-[11px] font-semibold leading-[1.5]"
              style={{ color: 'var(--color-gold)' }}
            >
              {constatazione}
            </p>
          )}
          <Nota>
            La copertura misura quanta titolarità riesci a mettere negli 11 slot, non quanti
            giocatori hai. Serve anche a rosa incompleta.
          </Nota>
        </Pannello>

        {attiva && (
          <Pannello titolo="Panchina · ordine di subentro">
            {attiva.panchina.length === 0 ? (
              <p className="text-[11px] text-dim">Nessuna riserva.</p>
            ) : (
              <ul className="flex flex-col gap-[3px]">
                {attiva.panchina.slice(0, 12).map((c) => (
                  <li key={c.id} className="flex items-center gap-[7px] text-[12px]">
                    <b className="w-[12px]" style={{ color: RUOLO_COLORE[c.ruolo] }}>
                      {c.ruolo}
                    </b>
                    <span className="min-w-0 flex-1 truncate">{c.nome}</span>
                    <Numero
                      valore={`${c.probTitolare}%`}
                      dimensione={11}
                      peso={500}
                      colore={c.probTitolare < SOGLIA_TITOLARITA_DEBOLE ? 'var(--color-amber)' : undefined}
                    />
                  </li>
                ))}
              </ul>
            )}
          </Pannello>
        )}
      </div>

      {attiva && <Campo formazione={attiva} />}
    </div>
  );
}

function Campo({ formazione: f }: { formazione: FormazioneModulo }) {
  const deboli = RUOLI.flatMap((r) => f.undici[r]).filter((c) => c.debole).length;

  return (
    <div className="flex min-h-0 min-w-0 flex-col gap-[10px]">
      <div
        className="flex min-h-0 flex-1 flex-col justify-around gap-[10px] overflow-hidden rounded-[10px] border border-line px-[14px] py-[14px]"
        style={{ background: 'linear-gradient(180deg,var(--color-pitch-mid),var(--color-pitch))' }}
      >
        {ORDINE_CAMPO.map((r) => {
          const caselle = f.undici[r];
          const attesi = r === 'P' ? 1 : f.modulo.reparti[r];
          const mancanti = Math.max(0, attesi - caselle.length);
          return (
            <div key={r} className="flex flex-wrap justify-center gap-[12px]">
              {caselle.map(({ calciatore: c, debole }) => (
                <div
                  key={c.id}
                  className="rounded-[8px] border px-[6px] py-[8px] text-center"
                  style={{
                    width: 132,
                    background: 'rgba(0,0,0,.40)',
                    borderColor: debole ? 'var(--color-amber)' : 'var(--color-line)',
                  }}
                  title={debole ? 'Titolarità sotto il 55%: casella debole' : undefined}
                >
                  <b className="block truncate text-[13px] font-extrabold">{c.nome}</b>
                  <span className="block truncate text-[10px] text-dim">{c.squadra}</span>
                  <span className="mt-[2px] flex items-center justify-center gap-[5px]">
                    <Numero
                      valore={`${c.probTitolare}%`}
                      dimensione={11}
                      peso={500}
                      colore={debole ? 'var(--color-amber)' : undefined}
                    />
                    {c.rigorista && <BadgeRig incerto={c.rigoristaIncerto} />}
                  </span>
                </div>
              ))}
              {Array.from({ length: mancanti }).map((_, i) => (
                <div
                  key={`vuoto-${r}-${i}`}
                  className="grid place-items-center rounded-[8px] text-[11px] text-dim"
                  style={{ width: 132, height: 62, border: '1px dashed var(--color-line)' }}
                >
                  {r} mancante
                </div>
              ))}
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-[18px] text-[11px] text-dim">
        <span>
          Modulo <b className="text-chalk">{f.modulo.nome}</b> · copertura{' '}
          <b className="n text-chalk">{f.copertura}%</b>
        </span>
        {deboli > 0 && (
          <span className="text-amber">
            {deboli} titolar{deboli === 1 ? 'e' : 'i'} sotto il 55% di titolarità
          </span>
        )}
        {f.mancanti.length > 0 && (
          <span className="text-amber">
            mancano {f.mancanti.map((m) => `${m.quanti} ${m.ruolo}`).join(', ')}
          </span>
        )}
        {f.titolaritaMedia !== null && (
          <span>
            titolarità media dell'undici <b className="n text-chalk">{f.titolaritaMedia}%</b>
          </span>
        )}
      </div>
    </div>
  );
}
