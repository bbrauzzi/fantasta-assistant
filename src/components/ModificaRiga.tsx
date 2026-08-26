/* F1 - modifica inline: fascia, rigorista, titolarità, quotazione, note.
   F14 - correzione rapida della squadra, per quando sento di un trasferimento
   e non ho voglia di riscaricare tutto il file.

   Ogni campo toccato qui viene marcato come "modificato a mano": il prossimo
   aggiornamento del listone non lo sovrascriverà. */

import { Trash2 } from 'lucide-react';
import type { Calciatore, CampoModificabile, Fascia, Ruolo } from '../types';
import { FASCE, RUOLI } from '../domain/costanti';
import { useStore } from '../store/store';
import { useUI } from '../store/ui';
import { MiniPulsante } from '../ui/primitive';

export function ModificaRiga({ calciatore: c }: { calciatore: Calciatore }) {
  const modifica = useStore((s) => s.modificaCalciatore);
  const elimina = useStore((s) => s.eliminaCalciatore);
  const apriModifica = useUI((s) => s.apriModifica);

  const set = (patch: Partial<Calciatore>, campo?: CampoModificabile) =>
    modifica(c.id, patch, campo ? [campo] : []);

  return (
    <div
      className="flex flex-wrap items-end gap-[14px] px-[12px] py-[9px] pb-[11px] pl-[60px] text-[11px]"
      style={{ background: 'rgba(0,0,0,.26)', borderTop: '1px solid rgba(244,240,230,.05)' }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') apriModifica(null);
      }}
    >
      <Etichetta testo="Squadra">
        <input
          value={c.squadra}
          onChange={(e) => set({ squadra: e.target.value }, 'squadra')}
          aria-label={`Squadra di ${c.nome}`}
          className="w-[110px] rounded-[5px] border border-line px-[7px] py-[4px] text-[12px]"
          style={{ background: 'rgba(0,0,0,.35)' }}
        />
      </Etichetta>

      <Etichetta testo="Ruolo">
        <select
          value={c.ruolo}
          onChange={(e) => set({ ruolo: e.target.value as Ruolo }, 'ruolo')}
          aria-label={`Ruolo di ${c.nome}`}
          className="rounded-[5px] border border-line px-[6px] py-[4px] text-[12px]"
          style={{ background: 'rgba(0,0,0,.35)' }}
        >
          {RUOLI.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </Etichetta>

      <Etichetta testo="Fascia">
        <select
          value={c.fascia}
          onChange={(e) => set({ fascia: e.target.value as Fascia }, 'fascia')}
          aria-label={`Fascia di ${c.nome}`}
          className="rounded-[5px] border border-line px-[6px] py-[4px] text-[12px]"
          style={{ background: 'rgba(0,0,0,.35)' }}
        >
          {FASCE.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
      </Etichetta>

      <Etichetta testo="% tit.">
        <input
          value={String(c.probTitolare)}
          onChange={(e) =>
            set(
              { probTitolare: Math.min(100, Number(e.target.value.replace(/[^0-9]/g, '')) || 0) },
              'probTitolare',
            )
          }
          inputMode="numeric"
          aria-label={`Titolarità di ${c.nome}`}
          className="n w-[52px] rounded-[5px] border border-line px-[7px] py-[4px] text-center text-[12px]"
          style={{ background: 'rgba(0,0,0,.35)' }}
        />
      </Etichetta>

      <Etichetta testo="Quotazione">
        <input
          value={String(c.quotazioneBase)}
          onChange={(e) =>
            set({ quotazioneBase: Number(e.target.value.replace(/[^0-9]/g, '')) || 0 }, 'quotazioneBase')
          }
          inputMode="numeric"
          aria-label={`Quotazione di ${c.nome}`}
          className="n w-[56px] rounded-[5px] border border-line px-[7px] py-[4px] text-center text-[12px]"
          style={{ background: 'rgba(0,0,0,.35)' }}
        />
      </Etichetta>

      <label
        className="flex cursor-pointer items-center gap-[5px] pb-[5px] text-[11px]"
        title="Segnandolo a mano risolvi l'incertezza sulla gerarchia"
      >
        <input
          type="checkbox"
          checked={c.rigorista}
          onChange={(e) =>
            set(
              { rigorista: e.target.checked, rigoristaIncerto: false },
              'rigorista',
            )
          }
        />
        Rigorista
        {c.rigoristaIncerto && <span className="text-amber">?</span>}
      </label>

      <label className="flex cursor-pointer items-center gap-[5px] pb-[5px] text-[11px]">
        <input
          type="checkbox"
          checked={c.tiratorePunizioni}
          onChange={(e) => set({ tiratorePunizioni: e.target.checked }, 'tiratorePunizioni')}
        />
        Punizioni
      </label>

      <Etichetta testo="Note" cresci>
        <input
          value={c.note}
          onChange={(e) => set({ note: e.target.value })}
          placeholder="es. rientra dopo la sosta"
          aria-label={`Note su ${c.nome}`}
          className="w-full rounded-[5px] border border-line px-[7px] py-[4px] text-[12px]"
          style={{ background: 'rgba(0,0,0,.35)' }}
        />
      </Etichetta>

      <MiniPulsante
        variante="danger"
        onClick={() => {
          apriModifica(null);
          elimina(c.id);
        }}
        title="Elimina dal listone"
      >
        <Trash2 size={11} />
      </MiniPulsante>
      <MiniPulsante onClick={() => apriModifica(null)}>Chiudi</MiniPulsante>

      {c.modificatiAMano.length > 0 && (
        <p className="w-full text-[10px] text-dim">
          Campi tuoi, protetti dai prossimi aggiornamenti del listone:{' '}
          <b className="text-chalk">{c.modificatiAMano.join(', ')}</b>.
        </p>
      )}
    </div>
  );
}

function Etichetta({
  testo,
  children,
  cresci,
}: {
  testo: string;
  children: React.ReactNode;
  cresci?: boolean;
}) {
  return (
    <label className={`flex flex-col gap-[3px] ${cresci ? 'min-w-[160px] flex-1' : ''}`}>
      <span className="titolo-pannello">{testo}</span>
      {children}
    </label>
  );
}
