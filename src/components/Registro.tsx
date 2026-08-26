/* F12 - registro cronologico e filtrabile. Serve a due cose: capire cosa è
   cambiato quando l'auto-rimpiazzo muove la lista, e ricostruire l'asta dopo. */

import { useMemo, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import type { TipoEvento } from '../types';
import { useStore } from '../store/store';
import { MiniPulsante, Nota, Pannello, Pulsante } from '../ui/primitive';

const ETICHETTE: Record<TipoEvento, string> = {
  acquisto: 'Acquisti',
  perdita: 'Persi',
  scarto: 'Scarti',
  obiettivo: 'Obiettivi',
  rimpiazzo: 'Rimpiazzi',
  config: 'Configurazione',
  listone: 'Listone',
  sistema: 'Sistema',
};

const TIPI = Object.keys(ETICHETTE) as TipoEvento[];

export function Registro() {
  const eventi = useStore((s) => s.registroEventi);
  const snapshot = useStore((s) => s.snapshot);
  const ripristinaSnapshot = useStore((s) => s.ripristinaSnapshot);
  const creaSnapshot = useStore((s) => s.creaSnapshot);
  const [filtro, setFiltro] = useState<TipoEvento | 'tutti'>('tutti');

  const visibili = useMemo(
    () => (filtro === 'tutti' ? eventi : eventi.filter((e) => e.tipo === filtro)),
    [eventi, filtro],
  );

  return (
    <div className="grid gap-[16px] px-[18px] py-[16px]" style={{ gridTemplateColumns: '1fr 330px' }}>
      <Pannello
        titolo={`Registro — ${visibili.length} voci`}
        azione={
          <div className="flex flex-wrap gap-[4px]">
            <FiltroPill attivo={filtro === 'tutti'} onClick={() => setFiltro('tutti')}>
              Tutto
            </FiltroPill>
            {TIPI.map((t) => (
              <FiltroPill key={t} attivo={filtro === t} onClick={() => setFiltro(t)}>
                {ETICHETTE[t]}
              </FiltroPill>
            ))}
          </div>
        }
      >
        {visibili.length === 0 ? (
          <p className="text-[11px] text-dim">Nessuna voce.</p>
        ) : (
          <ul className="flex flex-col" style={{ maxHeight: 'calc(100vh - 260px)', overflowY: 'auto' }}>
            {visibili.map((e) => (
              <li
                key={e.id}
                className="flex items-baseline gap-[10px] border-b border-line-soft py-[6px] text-[12px] last:border-0"
              >
                <span className="n shrink-0 text-[11px] text-dim">
                  {new Date(e.quando).toLocaleTimeString('it-IT')}
                </span>
                <span
                  className="shrink-0 text-[9px] uppercase text-dim"
                  style={{ minWidth: 84, letterSpacing: '.1em' }}
                >
                  {ETICHETTE[e.tipo]}
                </span>
                <span style={{ color: e.automatico ? 'var(--color-gold)' : undefined }}>{e.testo}</span>
              </li>
            ))}
          </ul>
        )}
      </Pannello>

      <aside className="flex flex-col gap-[12px]">
        <Pannello
          titolo={`Snapshot — ${snapshot.length}`}
          azione={
            <MiniPulsante onClick={() => creaSnapshot('salvato a mano')}>Salvane uno</MiniPulsante>
          }
        >
          {snapshot.length === 0 ? (
            <p className="text-[11px] text-dim">
              Vengono creati automaticamente prima di ogni aggiornamento del listone e prima dei reset.
            </p>
          ) : (
            <ul className="flex flex-col gap-[4px]">
              {snapshot.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-2 text-[11px]">
                  <span className="min-w-0 truncate">
                    <span className="n text-dim">
                      {new Date(s.quando).toLocaleTimeString('it-IT', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>{' '}
                    {s.etichetta}
                  </span>
                  <Pulsante
                    variante="dim"
                    className="!px-[8px] !py-[4px] !text-[10px]"
                    onClick={() => ripristinaSnapshot(s.id)}
                  >
                    <RotateCcw size={10} />
                  </Pulsante>
                </li>
              ))}
            </ul>
          )}
          <Nota>
            Gli snapshot restano in memoria per questa sessione: per un backup che sopravvive al
            browser usa l'export JSON nel Setup.
          </Nota>
        </Pannello>
      </aside>
    </div>
  );
}

function FiltroPill({
  attivo,
  onClick,
  children,
}: {
  attivo: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-[6px] px-[8px] py-[3px] text-[10px] font-bold"
      style={
        attivo
          ? { background: 'var(--color-gold)', color: 'var(--color-ink)' }
          : { border: '1px solid var(--color-line)', color: 'var(--color-dim)' }
      }
    >
      {children}
    </button>
  );
}
