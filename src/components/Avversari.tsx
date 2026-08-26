/* F7 - tracker avversari. Tutto quello che si vede qui è una stima costruita
   sui dati che ho inserito io: dove il tracciamento è parziale, per eccesso. */

import { useState } from 'react';
import { ChevronDown, ChevronRight, RotateCcw } from 'lucide-react';
import { RUOLI, RUOLO_COLORE } from '../domain/costanti';
import { chiPuoRilanciare, conteggioPerSoglie, etichettaRuoliSaturi } from '../domain/avversari';
import { useStore } from '../store/store';
import { useAvversariCalcolati } from '../store/derivati';
import { MiniPulsante, Nota, Numero, Pannello } from '../ui/primitive';

const GRIGLIA = '26px 1fr 66px 60px 74px 92px 180px';
const SOGLIE = [20, 40, 80, 140];

export function Avversari() {
  const rinomina = useStore((s) => s.rinominaAvversario);
  const incrementa = useStore((s) => s.incrementaSpesaAvversario);
  const azzera = useStore((s) => s.azzeraAvversario);
  const eventi = useStore((s) => s.registroEventi);
  const avversari = useAvversariCalcolati();

  const [espansi, setEspansi] = useState<Set<string>>(new Set());
  const [soglia, setSoglia] = useState('30');

  const prezzo = Number(soglia) || 0;
  const rilanci = chiPuoRilanciare(avversari, prezzo);
  const perSoglie = conteggioPerSoglie(avversari, SOGLIE);
  const saturi = avversari.filter((a) => a.ruoliSaturi.length > 0);

  const alterna = (id: string) =>
    setEspansi((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  return (
    <div className="grid gap-[18px] px-[20px] py-[18px]" style={{ gridTemplateColumns: '1fr 330px' }}>
      <div className="min-w-0">
        <div
          className="grid gap-[8px] px-[6px] py-[6px] text-[9px] uppercase text-dim"
          style={{ gridTemplateColumns: GRIGLIA, letterSpacing: '.12em' }}
        >
          <span />
          <span>Squadra</span>
          <span>Speso</span>
          <span>Slot</span>
          <span>Residui</span>
          <span>Max offerta</span>
          <span>Conteggio rapido</span>
        </div>

        {avversari.map((a) => {
          const fuoriContesa = a.maxOfferta <= 25;
          const aperto = espansi.has(a.id);
          const colore = a.datiParziali ? 'var(--color-amber)' : undefined;
          return (
            <div key={a.id} style={{ borderTop: '1px solid var(--color-line-soft)' }}>
              <div
                className="grid items-center gap-[8px] px-[6px] py-[9px] text-[13px]"
                style={{ gridTemplateColumns: GRIGLIA, opacity: fuoriContesa ? 0.62 : 1 }}
              >
                <button type="button" onClick={() => alterna(a.id)} aria-label="Espandi" className="text-dim">
                  {aperto ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
                <span className="flex min-w-0 items-baseline gap-[7px]">
                  <input
                    value={a.nome}
                    onChange={(e) => rinomina(a.id, e.target.value)}
                    aria-label="Nome squadra avversaria"
                    className="min-w-0 flex-1 border-0 bg-transparent px-0 text-[13px] font-bold outline-none"
                  />
                  {a.datiParziali && (
                    <span className="shrink-0 whitespace-nowrap text-[10px] text-amber">~ dati parziali</span>
                  )}
                  {a.ruoliSaturi.length > 0 && (
                    <span className="shrink-0 whitespace-nowrap text-[10px] text-ok">
                      · {etichettaRuoliSaturi(a.ruoliSaturi)}
                    </span>
                  )}
                </span>
                <Numero valore={a.speso} dimensione={13} peso={500} />
                <Numero valore={`${a.slotOccupati}/${a.slotTotali}`} dimensione={12} peso={500} colore={colore} />
                <Numero valore={a.residui} dimensione={13} peso={500} colore={colore} />
                <Numero
                  valore={a.maxOfferta}
                  dimensione={16}
                  colore={fuoriContesa ? 'var(--color-ok)' : colore}
                />
                <span className="flex items-center gap-[4px]">
                  {[1, 5, 10, 25].map((n) => (
                    <MiniPulsante key={n} onClick={() => incrementa(a.id, n)} title={`+${n} crediti spesi`}>
                      +{n}
                    </MiniPulsante>
                  ))}
                  <MiniPulsante onClick={() => azzera(a.id)} title="Azzera il conteggio rapido">
                    <RotateCcw size={10} />
                  </MiniPulsante>
                </span>
              </div>

              {aperto && (
                <div className="px-[6px] pb-[10px] pl-[32px]">
                  {a.calciatori.length === 0 ? (
                    <p className="text-[11px] text-dim">Nessun acquisto tracciato per giocatore.</p>
                  ) : (
                    <div className="flex flex-wrap gap-[5px]">
                      {a.calciatori.map((c) => (
                        <span
                          key={c.id}
                          className="rounded-[5px] border border-line px-[7px] py-[3px] text-[11px]"
                          style={{ background: 'rgba(0,0,0,.30)' }}
                        >
                          <b style={{ color: RUOLO_COLORE[c.ruolo] }}>{c.ruolo}</b> {c.nome}
                          {c.prezzoDiMercato !== null && (
                            <span className="n ml-[5px] text-dim">{c.prezzoDiMercato}</span>
                          )}
                        </span>
                      ))}
                    </div>
                  )}
                  {a.slotManuali > 0 && (
                    <p className="mt-[7px] text-[11px] text-amber">
                      {a.slotManuali} acquisti registrati solo col conteggio rapido ({a.speseManuali}{' '}
                      crediti): i residui sono approssimati.
                    </p>
                  )}
                  <p className="mt-[6px] text-[10px] text-dim">
                    Per ruolo: {RUOLI.map((r) => `${r} ${a.presiPerRuolo[r]}`).join(' · ')}
                  </p>
                </div>
              )}
            </div>
          );
        })}

        <p className="mt-[14px] text-[10px] leading-[1.5] text-dim">
          Stime sui dati che hai inserito tu: dove il tracciamento è parziale i residui sono per
          eccesso. Per rendere precisa una squadra, segna i suoi acquisti dal listone con «VS»
          indicando nome e prezzo.
        </p>
      </div>

      <aside className="flex flex-col gap-[12px]">
        <Pannello titolo="Chi può rilanciare">
          <div className="mb-[8px] flex items-center gap-[8px]">
            <span className="text-[11px] text-dim">sopra</span>
            <input
              value={soglia}
              onChange={(e) => setSoglia(e.target.value.replace(/[^0-9]/g, ''))}
              inputMode="numeric"
              aria-label="Soglia di prezzo"
              className="n w-[64px] rounded-[7px] border border-gold px-[8px] py-[5px] text-center text-[13px]"
              style={{ background: 'rgba(0,0,0,.35)' }}
            />
            <span className="text-[11px] text-dim">crediti</span>
          </div>
          <span className="flex items-baseline gap-[8px]">
            <Numero valore={rilanci.possono.length} dimensione={44} />
            <span className="n text-[16px] text-dim">su {rilanci.totale} squadre</span>
          </span>
          <ul className="mt-[8px] flex flex-col gap-[3px]">
            {perSoglie.map((s) => (
              <li key={s.soglia} className="flex justify-between text-[11px] text-dim">
                <span>oltre {s.soglia}</span>
                <span className="n text-chalk">{s.quanti}</span>
              </li>
            ))}
          </ul>
        </Pannello>

        <Pannello titolo="Ruoli già saturi">
          {saturi.length === 0 ? (
            <p className="text-[11px] text-dim">Nessuna squadra ha ancora completato un reparto.</p>
          ) : (
            <ul className="flex flex-col gap-[3px]">
              {saturi.map((a) => (
                <li key={a.id} className="flex justify-between text-[11px]">
                  <span className="truncate">{a.nome}</span>
                  <span className="text-ok">{etichettaRuoliSaturi(a.ruoliSaturi)}</span>
                </li>
              ))}
            </ul>
          )}
          <Nota>Chi ha saturato un ruolo è fuori dalla contesa su quel ruolo.</Nota>
        </Pannello>

        <Pannello titolo="Registro">
          <ul className="flex flex-col gap-[3px]">
            {eventi.slice(0, 12).map((e) => (
              <li key={e.id} className="flex items-baseline gap-[7px] text-[11px]">
                <span className="n shrink-0 text-dim">
                  {new Date(e.quando).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                </span>
                <span className="truncate" style={{ color: e.automatico ? 'var(--color-gold)' : undefined }}>
                  {e.testo}
                </span>
              </li>
            ))}
            {eventi.length === 0 && <li className="text-[11px] text-dim">Ancora niente.</li>}
          </ul>
        </Pannello>
      </aside>
    </div>
  );
}
