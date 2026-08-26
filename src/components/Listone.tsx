/* F1 - vista principale: filtri, tabella densa, colonna dei pannelli. */

import { useEffect, useMemo, useRef } from 'react';
import { ExternalLink, Plus, Upload } from 'lucide-react';
import { FASCE, RUOLI } from '../domain/costanti';
import { filtra, ordina } from '../domain/filtri';
import { useStore } from '../store/store';
import { useUI, type CampoOrdinamento } from '../store/ui';
import { useAvversariCalcolati, useStatoBudget } from '../store/derivati';
import { Campo, Pulsante, Selezione } from '../ui/primitive';
import { GRIGLIA, RigaListone } from './RigaListone';
import { PannelloRilanci, PannelloRosa, PannelloScarsita } from './PannelliLaterali';
import { BannerDaRivedere } from './BannerDaRivedere';

export function Listone() {
  const calciatori = useStore((s) => s.calciatori);
  const config = useStore((s) => s.config);
  const idLampeggio = useStore((s) => s.idLampeggio);
  const pulisciLampeggio = useStore((s) => s.pulisciLampeggio);

  const filtri = useUI((s) => s.filtri);
  const setFiltro = useUI((s) => s.setFiltro);
  const ordinamento = useUI((s) => s.ordinamento);
  const ordinaPer = useUI((s) => s.ordinaPer);
  const idSelezionato = useUI((s) => s.idSelezionato);
  const setModale = useUI((s) => s.setModale);
  const idInModifica = useUI((s) => s.idInModifica);

  const st = useStatoBudget();
  const avversari = useAvversariCalcolati();
  const campoRicerca = useRef<HTMLInputElement>(null);

  // il lampeggio del rimpiazzo dura ~2s, poi si spegne da solo
  useEffect(() => {
    if (!idLampeggio) return;
    const t = setTimeout(pulisciLampeggio, 2200);
    return () => clearTimeout(t);
  }, [idLampeggio, pulisciLampeggio]);

  useEffect(() => {
    const vai = () => campoRicerca.current?.focus();
    window.addEventListener('fantasta:cerca', vai);
    return () => window.removeEventListener('fantasta:cerca', vai);
  }, []);

  const squadre = useMemo(
    () => [...new Set(calciatori.map((c) => c.squadra))].sort((a, b) => a.localeCompare(b)),
    [calciatori],
  );

  const visibili = useMemo(
    () => ordina(filtra(calciatori, filtri), ordinamento.campo, ordinamento.discendente, config, filtri.query),
    [calciatori, filtri, ordinamento, config],
  );

  // l'elenco visibile guida le frecce su/giu': lo pubblico per le scorciatoie
  useEffect(() => {
    (window as unknown as { __listaVisibile?: string[] }).__listaVisibile = visibili.map((c) => c.id);
  }, [visibili]);

  const selezionato = calciatori.find((c) => c.id === idSelezionato) ?? null;

  return (
    <div className="grid gap-[16px] px-[18px] py-[16px]" style={{ gridTemplateColumns: '1fr 336px' }}>
      <div className="flex min-w-0 flex-col gap-[10px]">
        <BannerDaRivedere />

        <div className="flex flex-wrap items-center gap-[8px]">
          <Campo
            ref={campoRicerca}
            value={filtri.query}
            onChange={(e) => setFiltro('query', e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setFiltro('query', '');
                e.currentTarget.blur();
              }
            }}
            placeholder="Cerca calciatore o squadra…  ( / )"
            className="flex-1"
            aria-label="Cerca calciatore o squadra"
          />
          <Selezione
            value={filtri.ruolo}
            onChange={(e) => setFiltro('ruolo', e.target.value as never)}
            aria-label="Filtra per ruolo"
          >
            <option value="tutti">Tutti i ruoli</option>
            {RUOLI.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </Selezione>
          <Selezione
            value={filtri.fascia}
            onChange={(e) => setFiltro('fascia', e.target.value as never)}
            aria-label="Filtra per fascia"
          >
            <option value="tutte">Tutte le fasce</option>
            {FASCE.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </Selezione>
          <Selezione
            value={filtri.squadra}
            onChange={(e) => setFiltro('squadra', e.target.value)}
            aria-label="Filtra per squadra"
          >
            <option value="tutte">Tutte le squadre</option>
            {squadre.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Selezione>
          <label className="flex cursor-pointer items-center gap-[5px] whitespace-nowrap text-[12px] text-dim">
            <input
              type="checkbox"
              checked={filtri.soloDisponibili}
              onChange={(e) => setFiltro('soloDisponibili', e.target.checked)}
            />
            Solo disponibili
          </label>
          <label className="flex cursor-pointer items-center gap-[5px] whitespace-nowrap text-[12px] text-dim">
            <input
              type="checkbox"
              checked={filtri.soloRigoristi}
              onChange={(e) => setFiltro('soloRigoristi', e.target.checked)}
            />
            Rigoristi
          </label>
          <label
            className="flex cursor-pointer items-center gap-[5px] whitespace-nowrap text-[12px] text-dim"
            title="Rigoristi e tiratori di punizioni"
          >
            <input
              type="checkbox"
              checked={filtri.soloPiazzati}
              onChange={(e) => setFiltro('soloPiazzati', e.target.checked)}
            />
            Piazzati
          </label>
          <Pulsante
            variante="fantasma"
            onClick={() => setModale({ tipo: 'nuovo-calciatore' })}
            title="Aggiungi un calciatore a mano"
          >
            <Plus size={13} />
          </Pulsante>
          <Pulsante
            variante="fantasma"
            onClick={() => setModale({ tipo: 'import' })}
            className="flex items-center gap-[6px] whitespace-nowrap"
          >
            <Upload size={13} /> Aggiorna listone
          </Pulsante>
          <Pulsante
            variante="fantasma"
            className="flex items-center gap-[6px] whitespace-nowrap"
            onClick={() => window.open(config.linkFormazioniProbabili, '_blank', 'noopener,noreferrer')}
            title="Apre in una nuova scheda l'indirizzo configurato in Setup → Link esterni"
          >
            <ExternalLink size={13} /> Probabili formazioni
          </Pulsante>
        </div>

        <div className="overflow-hidden rounded-[10px] border border-line">
          <Intestazioni campo={ordinamento.campo} discendente={ordinamento.discendente} onOrdina={ordinaPer} />
          <div style={{ maxHeight: 'calc(100vh - 300px)', overflowY: 'auto' }}>
            {visibili.length === 0 ? (
              <p className="px-[12px] py-[18px] text-[12px] text-dim">
                Nessun calciatore con questi filtri.
              </p>
            ) : (
              visibili.map((c) => (
                <RigaListone
                  key={c.id}
                  calciatore={c}
                  st={st}
                  avversari={avversari}
                  selezionata={c.id === idSelezionato}
                  lampeggia={c.id === idLampeggio}
                  inModifica={c.id === idInModifica}
                />
              ))
            )}
          </div>
        </div>

        <p className="text-[10px] text-dim">
          {visibili.length} calciatori mostrati su {calciatori.length}. Il prezzo consigliato è un
          riferimento scalato sui parametri della tua lega, non un prezzo di mercato: in asta il
          prezzo reale dipende dalla concorrenza sul momento.
        </p>
      </div>

      <aside className="flex flex-col gap-[12px]">
        <PannelloScarsita />
        <PannelloRilanci selezionato={selezionato} />
        <PannelloRosa />
      </aside>
    </div>
  );
}

function Intestazioni({
  campo,
  discendente,
  onOrdina,
}: {
  campo: CampoOrdinamento;
  discendente: boolean;
  onOrdina: (c: CampoOrdinamento) => void;
}) {
  const colonne: Array<{ etichetta: string; campo?: CampoOrdinamento }> = [
    { etichetta: '', campo: 'ruolo' },
    { etichetta: 'Calciatore', campo: 'nome' },
    { etichetta: 'Squadra', campo: 'squadra' },
    { etichetta: 'Fascia', campo: 'fascia' },
    { etichetta: 'Piazzati' },
    { etichetta: 'Tit.', campo: 'probTitolare' },
    { etichetta: 'Cons.', campo: 'consigliato' },
    { etichetta: '' },
    { etichetta: '' },
  ];

  return (
    <div
      className="grid gap-[10px] px-[12px] py-[7px] text-[9px] uppercase text-dim"
      style={{ gridTemplateColumns: GRIGLIA, letterSpacing: '.12em', background: 'rgba(0,0,0,.24)' }}
    >
      {colonne.map((c, i) =>
        c.campo ? (
          <button
            key={i}
            type="button"
            onClick={() => onOrdina(c.campo!)}
            className="text-left uppercase"
            style={{ letterSpacing: 'inherit', fontSize: 'inherit', color: campo === c.campo ? 'var(--color-gold)' : undefined }}
          >
            {c.etichetta}
            {campo === c.campo && (discendente ? ' ↓' : ' ↑')}
          </button>
        ) : (
          <span key={i}>{c.etichetta}</span>
        ),
      )}
    </div>
  );
}
