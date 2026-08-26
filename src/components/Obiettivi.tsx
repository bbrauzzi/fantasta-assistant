/* F3 - lista obiettivi: raggruppata per ruolo, riordinabile con il mouse.
   L'ordine è la mia scala di priorità e conta più di ogni ordinamento
   automatico, quindi il drag-and-drop lo riscrive esplicitamente. */

import { useMemo, useState } from 'react';
import { GripVertical, Star, Wand2 } from 'lucide-react';
import type { Ruolo } from '../types';
import { RUOLO_LABEL } from '../domain/costanti';
import { prezzoConsigliato } from '../domain/budget';
import { raggruppaObiettivi } from '../domain/obiettivi';
import { useStore } from '../store/store';
import { useUI } from '../store/ui';
import { useStatoBudget } from '../store/derivati';
import { BadgeRig, BadgeRuolo, MiniPulsante, Nota, Numero, PallinoFascia, Pannello, Pulsante } from '../ui/primitive';

export function Obiettivi() {
  const calciatori = useStore((s) => s.calciatori);
  const config = useStore((s) => s.config);
  const genera = useStore((s) => s.generaObiettiviMancanti);
  const sposta = useStore((s) => s.spostaObiettivo);
  const alterna = useStore((s) => s.alternaObiettivo);
  const idLampeggio = useStore((s) => s.idLampeggio);
  const setBozza = useUI((s) => s.setBozza);
  const seleziona = useUI((s) => s.seleziona);
  const setVista = useUI((s) => s.setVista);
  const st = useStatoBudget();

  const [trascinato, setTrascinato] = useState<{ ruolo: Ruolo; id: string } | null>(null);

  const gruppi = useMemo(
    () => raggruppaObiettivi(calciatori, config, RUOLO_LABEL),
    [calciatori, config],
  );

  const costoStimato = useMemo(
    () =>
      gruppi.reduce(
        (tot, g) =>
          tot +
          g.obiettivi
            .slice(0, g.slot)
            .reduce((s, c) => s + prezzoConsigliato(c.quotazioneBase, config), 0),
        0,
      ),
    [gruppi, config],
  );

  return (
    <div className="px-[18px] py-[16px]">
      <div className="mb-[12px] flex items-center gap-[12px]">
        <Pulsante variante="oro" onClick={genera} className="flex items-center gap-[6px]">
          <Wand2 size={13} /> Riempi gli slot scoperti
        </Pulsante>
        <span className="text-[11px] text-dim">
          Aggiunge i migliori disponibili dove mancano obiettivi. Non tocca quelli che hai messo tu.
        </span>
        <span className="ml-auto text-[11px] text-dim">
          Costo stimato dei primi obiettivi di ogni ruolo:{' '}
          <b className="n" style={{ color: costoStimato > st.residui ? 'var(--color-amber)' : 'var(--color-chalk)' }}>
            {costoStimato}
          </b>{' '}
          crediti sui {st.residui} residui
        </span>
      </div>

      <div className="grid gap-[12px]" style={{ gridTemplateColumns: 'repeat(4, minmax(0,1fr))' }}>
        {gruppi.map((g) => (
          <Pannello key={g.ruolo} titolo={g.intestazione}>
            {g.obiettivi.length === 0 ? (
              <p className="text-[11px] text-dim">Nessun obiettivo per questo ruolo.</p>
            ) : (
              <ol className="flex flex-col gap-[4px]">
                {g.obiettivi.map((c, i) => (
                  <li
                    key={c.id}
                    draggable
                    onDragStart={() => setTrascinato({ ruolo: g.ruolo, id: c.id })}
                    onDragOver={(e) => {
                      if (trascinato?.ruolo === g.ruolo) e.preventDefault();
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (trascinato?.ruolo === g.ruolo) sposta(g.ruolo, trascinato.id, i);
                      setTrascinato(null);
                    }}
                    onDragEnd={() => setTrascinato(null)}
                    onClick={() => {
                      seleziona(c.id);
                      setVista('listone');
                    }}
                    className={`flex cursor-grab items-center gap-[7px] rounded-[7px] border px-[8px] py-[6px] ${c.id === idLampeggio ? 'lampeggia' : ''}`}
                    style={{
                      borderColor: i < g.slot ? 'var(--color-line)' : 'rgba(29,88,67,.5)',
                      background: i < g.slot ? 'rgba(212,175,55,.06)' : 'rgba(0,0,0,.2)',
                      opacity: trascinato?.id === c.id ? 0.4 : 1,
                    }}
                  >
                    <GripVertical size={12} className="shrink-0 text-dim" />
                    <span className="n w-[14px] shrink-0 text-[10px] text-dim">{i + 1}</span>
                    <BadgeRuolo ruolo={c.ruolo} dimensione={18} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-[5px]">
                        <PallinoFascia fascia={c.fascia} />
                        <b className="truncate text-[12px] font-bold">{c.nome}</b>
                      </span>
                      {/* squadra, titolarita' e RIG sulla seconda riga: sul nome
                          lo spazio serve tutto, altrimenti si tronca */}
                      <span className="flex items-baseline gap-[5px] text-[10px] text-dim">
                        <span className="truncate">
                          {c.squadra} · {c.probTitolare}%
                        </span>
                        {c.rigorista && <BadgeRig incerto={c.rigoristaIncerto} />}
                      </span>
                    </span>
                    <Numero valore={prezzoConsigliato(c.quotazioneBase, config)} dimensione={12} />
                    <MiniPulsante
                      variante="dim"
                      title="Togli dagli obiettivi"
                      onClick={(e) => {
                        e.stopPropagation();
                        alterna(c.id);
                      }}
                    >
                      <Star size={10} fill="currentColor" />
                    </MiniPulsante>
                    <MiniPulsante
                      variante="ok"
                      title="Vai alla riga nel listone per fare l'offerta"
                      onClick={(e) => {
                        e.stopPropagation();
                        seleziona(c.id);
                        setBozza(c.id, String(prezzoConsigliato(c.quotazioneBase, config)));
                        setVista('listone');
                      }}
                    >
                      Offri
                    </MiniPulsante>
                  </li>
                ))}
              </ol>
            )}
            {g.alternative > 0 && (
              <Nota>
                Le voci oltre la {g.slot}ª sono alternative: le tieni pronte, non occupano slot.
              </Nota>
            )}
          </Pannello>
        ))}
      </div>

      <p className="mt-[14px] text-[10px] leading-[1.5] text-dim">
        Trascina per riordinare dentro un ruolo. Quando un obiettivo esce dal mercato e lo slot resta
        scoperto, il miglior candidato viene promosso automaticamente: lampeggia in oro e finisce nel
        registro. Ogni promozione è annullabile con Ctrl+Z.
      </p>
    </div>
  );
}
