/* F4/F5 - barra di stato sticky. Non scorre mai via.
   I due numeri piu' grandi della pagina sono crediti residui e max offerta. */

import { AlertTriangle, Keyboard, Zap } from 'lucide-react';
import { RUOLI } from '../domain/costanti';
import { spiegaMaxOfferta } from '../domain/budget';
import { etichettaFreschezza, giorniDaAggiornamento } from '../domain/listone';
import { useStore } from '../store/store';
import { useAnalisiRosa, useStatoBudget } from '../store/derivati';
import { BarraAvanzamento, Numero, Pulsante } from '../ui/primitive';

export function BarraStato({
  onAstaRapida,
  onAiuto,
}: {
  onAstaRapida: () => void;
  onAiuto: () => void;
}) {
  const config = useStore((s) => s.config);
  const ultimoSalvataggio = useStore((s) => s.ultimoSalvataggio);
  const ultimoAggiornamento = useStore((s) => s.ultimoAggiornamentoListone);
  const st = useStatoBudget();
  const analisi = useAnalisiRosa();

  const freschezza = etichettaFreschezza(giorniDaAggiornamento(ultimoAggiornamento));
  const residuiNegativi = st.residui < 0;

  return (
    <header
      className="sticky top-0 z-30 flex items-center gap-[14px] border-b-2 border-line px-[14px] py-[12px]"
      style={{ background: 'linear-gradient(180deg,#134C36,#0B3D2E)' }}
    >
      <div
        className="font-bold uppercase"
        style={{ fontFamily: 'var(--font-cond)', fontSize: 22, letterSpacing: '.06em' }}
      >
        FantAsta
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
