/* F4/F5 - barra di stato sticky. Non scorre mai via.
   I due numeri piu' grandi della pagina sono crediti residui e max offerta. */

import { AlertTriangle, Keyboard, Zap } from 'lucide-react';
import { RUOLI, RUOLO_COLORE } from '../domain/costanti';
import { spiegaMaxOfferta } from '../domain/budget';
import { etichettaFreschezza, giorniDaAggiornamento } from '../domain/listone';
import { useStore } from '../store/store';
import { useUI } from '../store/ui';
import { useAnalisiRosa, useStatoBudget } from '../store/derivati';
import { BarraAvanzamento, Numero, Pulsante } from '../ui/primitive';

export function BarraStato({
  onAstaRapida,
  onAiuto,
}: {
  onAstaRapida: () => void;
  onAiuto: () => void;
}) {
  const tema = useUI((s) => s.tema);
  const config = useStore((s) => s.config);
  const ultimoSalvataggio = useStore((s) => s.ultimoSalvataggio);
  const ultimoAggiornamento = useStore((s) => s.ultimoAggiornamentoListone);
  const st = useStatoBudget();
  const analisi = useAnalisiRosa();

  const freschezza = etichettaFreschezza(giorniDaAggiornamento(ultimoAggiornamento));
  const residuiNegativi = st.residui < 0;
  const testoSalvataggio = ultimoSalvataggio
    ? `salvato ${new Date(ultimoSalvataggio).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}`
    : 'salvataggio automatico';
  const titoloSegnalazioni = analisi.segnalazioni
    .filter((s) => s.livello === 'attenzione')
    .map((s) => s.testo)
    .join(' · ');

  if (tema === 'grafite') {
    return (
      <header
        className="sticky top-0 z-30 flex items-stretch gap-0"
        style={{ borderBottom: '1px solid var(--color-line)', background: 'var(--color-pitch-mid)' }}
      >
        <div className="flex items-center gap-[9px] px-[18px]">
          <span style={{ width: 3, height: 18, background: 'var(--color-gold)', display: 'block' }} />
          <span className="min-w-0">
            <span
              className="block font-bold uppercase"
              style={{ fontFamily: 'var(--font-cond)', fontSize: 21, letterSpacing: '.08em' }}
            >
              {config.nomeMiaSquadra}
            </span>
            <span
              className="block truncate uppercase"
              style={{ fontSize: 9, letterSpacing: '.16em', color: '#A8A8A8' }}
            >
              {config.nomeLega}
            </span>
          </span>
        </div>

        <div
          className="flex items-baseline gap-[12px] px-[20px] py-[12px]"
          style={{ borderLeft: '1px solid var(--color-line)' }}
        >
          <div>
            <div className="whitespace-nowrap uppercase" style={{ fontSize: 9, letterSpacing: '.16em', color: '#A8A8A8' }}>
              Crediti residui
            </div>
            <div className="mt-[2px] flex items-baseline gap-[6px]">
              <Numero
                valore={st.residui}
                dimensione={34}
                peso={500}
                colore={residuiNegativi ? 'var(--color-danger)' : undefined}
              />
              <span className="n" style={{ fontSize: 12, color: '#A8A8A8' }}>
                /{config.budgetTotale}
              </span>
            </div>
          </div>
        </div>

        <div
          className="flex items-baseline px-[20px] py-[12px]"
          style={{
            borderLeft: '1px solid var(--color-line)',
            background: 'color-mix(in srgb, var(--color-gold) 5%, transparent)',
          }}
          title={spiegaMaxOfferta(st)}
        >
          <div>
            <div
              className="whitespace-nowrap uppercase"
              style={{ fontSize: 9, letterSpacing: '.16em', color: 'var(--color-gold)' }}
            >
              Max offerta ora
            </div>
            <div className="mt-[2px] flex items-baseline gap-[8px]">
              <Numero valore={st.maxOfferta} dimensione={34} peso={600} colore="var(--color-gold)" />
              <span className="whitespace-nowrap" style={{ fontSize: 10, color: '#A8A8A8' }}>
                {st.slotDaRiempire} slot
                <br />
                da riempire
              </span>
            </div>
          </div>
        </div>

        <div
          className="flex items-center gap-[20px] px-[20px] py-[12px]"
          style={{ borderLeft: '1px solid var(--color-line)' }}
        >
          {RUOLI.map((r) => {
            const sforato = st.residuoPerRuolo[r] < 0;
            const perc =
              st.budgetPerRuolo[r] > 0 ? (st.spesoPerRuolo[r] / st.budgetPerRuolo[r]) * 100 : 0;
            const colore = sforato ? 'var(--color-danger)' : RUOLO_COLORE[r];
            return (
              <div key={r} style={{ minWidth: 66 }}>
                <div className="flex items-baseline justify-between gap-[8px]">
                  <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.06em', color: colore }}>
                    {r}
                  </span>
                  <span className="n" style={{ fontSize: 9, color: '#A8A8A8' }}>
                    {st.presiPerRuolo[r]}/{config.slotPerRuolo[r]}
                  </span>
                </div>
                <div className="mt-[1px] flex items-baseline gap-[4px]">
                  <Numero valore={st.residuoPerRuolo[r]} dimensione={15} peso={500} colore={sforato ? 'var(--color-danger)' : undefined} />
                </div>
                <div className="mt-[5px]" style={{ height: 2, background: 'var(--color-line)' }}>
                  <div
                    style={{ height: 2, background: colore, width: `${Math.max(0, Math.min(100, perc))}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div
          className="ml-auto flex min-w-0 items-center gap-[14px] px-[18px]"
          style={{ borderLeft: '1px solid var(--color-line)' }}
        >
          {analisi.quanteAttenzioni > 0 && (
            <span
              className="flex items-center gap-[5px] whitespace-nowrap font-semibold"
              style={{ fontSize: 11, color: 'var(--color-amber)' }}
              title={titoloSegnalazioni}
            >
              <AlertTriangle size={12} />
              {analisi.quanteAttenzioni} segnalazion{analisi.quanteAttenzioni === 1 ? 'e' : 'i'}
            </span>
          )}
          <span
            className="flex min-w-0 flex-col items-end whitespace-nowrap"
            style={{ fontSize: 10, lineHeight: 1.4 }}
          >
            <span
              className="truncate"
              style={{ color: freschezza.marcato ? 'var(--color-amber)' : '#8F8F8F' }}
              title="Il listone va riscaricato dal sito e riapplicato con «Aggiorna listone»"
            >
              {freschezza.testo}
            </span>
            <span className="truncate" style={{ color: '#8F8F8F' }} title="Il salvataggio è automatico a ogni modifica">
              {testoSalvataggio}
            </span>
          </span>
          <button
            type="button"
            onClick={onAstaRapida}
            className="flex items-center gap-[6px] whitespace-nowrap font-semibold"
            style={{
              padding: '8px 13px',
              fontSize: 12,
              background: 'var(--color-gold)',
              color: 'var(--color-ink)',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <Zap size={13} /> Asta rapida
            <span className="n" style={{ fontSize: 10, opacity: 0.6 }}>
              F
            </span>
          </button>
          <button
            type="button"
            onClick={onAiuto}
            title="Mappa delle scorciatoie (?)"
            style={{
              padding: '8px 10px',
              border: '1px solid var(--color-line)',
              color: '#A8A8A8',
              background: 'transparent',
              cursor: 'pointer',
            }}
          >
            <Keyboard size={13} />
          </button>
        </div>
      </header>
    );
  }

  return (
    <header
      className="sticky top-0 z-30 flex items-center gap-[14px] border-b-2 border-line px-[14px] py-[12px]"
      style={{ background: 'linear-gradient(180deg,#134C36,#0B3D2E)' }}
    >
      <div className="min-w-0">
        <div
          className="font-bold uppercase"
          style={{ fontFamily: 'var(--font-cond)', fontSize: 22, letterSpacing: '.06em' }}
        >
          {config.nomeMiaSquadra}
        </div>
        <div
          className="truncate uppercase opacity-70"
          style={{ fontSize: 9, letterSpacing: '.16em' }}
        >
          {config.nomeLega}
        </div>
      </div>

      <div className="flex gap-[10px]">
        {/* Crediti residui: il numero piu' visibile della schermata */}
        <div
          className="rounded-[10px] border px-[16px] py-[6px]"
          style={{
            background: 'rgba(0,0,0,.28)',
            borderColor: residuiNegativi ? 'var(--color-danger)' : 'var(--color-line)',
          }}
        >
          <div
            className="whitespace-nowrap uppercase text-dim"
            style={{ fontSize: 9, letterSpacing: '.14em' }}
          >
            Crediti residui
          </div>
          <Numero
            valore={st.residui}
            dimensione={32}
            colore={residuiNegativi ? 'var(--color-danger)' : undefined}
            suffisso={
              <span className="text-[12px] font-normal text-dim"> / {config.budgetTotale}</span>
            }
          />
        </div>

        {/* Max offerta: cio' che posso davvero offrire ORA (F5) */}
        <div
          className="rounded-[10px] border border-gold px-[16px] py-[6px]"
          style={{ background: 'rgba(212,175,55,.10)' }}
          title={spiegaMaxOfferta(st)}
        >
          <div className="whitespace-nowrap uppercase text-gold" style={{ fontSize: 9, letterSpacing: '.14em' }}>
            Max offerta
          </div>
          <Numero valore={st.maxOfferta} dimensione={32} colore="var(--color-gold)" />
          <div className="whitespace-nowrap text-[9px] text-dim">
            {st.slotDaRiempire} slot da riempire
          </div>
        </div>
      </div>

      {/* Budget e slot per ruolo */}
      <div className="flex gap-[6px]">
        {RUOLI.map((r) => {
          const sforato = st.residuoPerRuolo[r] < 0;
          const perc =
            st.budgetPerRuolo[r] > 0
              ? (st.spesoPerRuolo[r] / st.budgetPerRuolo[r]) * 100
              : 0;
          return (
            <div
              key={r}
              className="rounded-[8px] border px-[10px] py-[6px]"
              style={{
                minWidth: 78,
                background: 'rgba(0,0,0,.24)',
                borderColor: sforato ? 'var(--color-danger)' : 'var(--color-line)',
              }}
              title={`${r}: ${st.spesoPerRuolo[r]} spesi su ${st.budgetPerRuolo[r]} pianificati · max offerta ${st.maxOffertaPerRuolo[r]}`}
            >
              <div className="whitespace-nowrap text-[10px] text-dim">
                {r} · {st.presiPerRuolo[r]}/{config.slotPerRuolo[r]}
              </div>
              <Numero
                valore={st.residuoPerRuolo[r]}
                dimensione={16}
                colore={sforato ? 'var(--color-danger)' : undefined}
              />
              <BarraAvanzamento
                perc={perc}
                colore={sforato ? 'var(--color-danger)' : 'var(--color-gold)'}
              />
            </div>
          );
        })}
      </div>

      <div className="ml-auto flex min-w-0 items-center gap-[8px]">
        {analisi.quanteAttenzioni > 0 && (
          <span
            className="flex items-center gap-1 whitespace-nowrap rounded-[6px] border px-[8px] py-[3px] text-[11px] font-semibold"
            style={{ color: 'var(--color-amber)', borderColor: 'var(--color-amber)' }}
            title={analisi.segnalazioni
              .filter((s) => s.livello === 'attenzione')
              .map((s) => s.testo)
              .join(' · ')}
          >
            <AlertTriangle size={12} />
            {analisi.quanteAttenzioni} segnalazion{analisi.quanteAttenzioni === 1 ? 'e' : 'i'}
          </span>
        )}
        <span
          className="min-w-0 truncate text-[10px]"
          style={{ color: freschezza.marcato ? 'var(--color-amber)' : 'var(--color-dim)' }}
          title="Il listone va riscaricato dal sito e riapplicato con «Aggiorna listone»"
        >
          {freschezza.testo}
        </span>
        <span className="min-w-0 truncate text-[10px] text-dim" title="Il salvataggio è automatico a ogni modifica">
          {ultimoSalvataggio
            ? `salvato ${new Date(ultimoSalvataggio).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}`
            : 'salvataggio automatico'}
        </span>
        <Pulsante variante="oro" onClick={onAstaRapida} className="flex items-center gap-[6px] whitespace-nowrap">
          <Zap size={13} /> Asta rapida · F
        </Pulsante>
        <Pulsante variante="fantasma" onClick={onAiuto} title="Mappa delle scorciatoie (?)">
          <Keyboard size={13} />
        </Pulsante>
      </div>
    </header>
  );
}
