/* F14 - "obiettivi da rivedere": resta visibile finché non li ho marcati come
   visti. Se un mio obiettivo è fra gli usciti, l'avviso non è ignorabile. */

import { AlertTriangle, Check } from 'lucide-react';
import { useStore } from '../store/store';
import { useDaRivedere } from '../store/derivati';
import { MiniPulsante } from '../ui/primitive';

const TESTO_MOTIVO: Record<string, string> = {
  uscito: 'non è più nel listone',
  trasferimento: 'ha cambiato squadra',
  ruolo: 'ha cambiato ruolo',
  quotazione: 'quotazione cambiata',
};

export function BannerDaRivedere() {
  const daRivedere = useDaRivedere();
  const segnaRivisto = useStore((s) => s.segnaRivisto);
  const segnaTuttiRivisti = useStore((s) => s.segnaTuttiRivisti);

  if (daRivedere.length === 0) return null;

  const grave = daRivedere.some((c) => c.daRivedere?.motivo === 'uscito');

  return (
    <section
      className="rounded-[10px] border px-[13px] py-[10px]"
      style={{
        borderColor: grave ? 'var(--color-danger)' : 'var(--color-amber)',
        background: grave ? 'rgba(194,75,63,.12)' : 'rgba(216,150,60,.10)',
      }}
    >
      <header className="mb-[7px] flex items-center justify-between">
        <h2
          className="flex items-center gap-[6px] titolo-pannello"
          style={{ color: grave ? 'var(--color-danger)' : 'var(--color-amber)' }}
        >
          <AlertTriangle size={12} />
          {daRivedere.length} da rivedere dopo l'aggiornamento del listone
        </h2>
        <MiniPulsante onClick={segnaTuttiRivisti}>Ho visto tutto</MiniPulsante>
      </header>
      <ul className="flex flex-col gap-[3px]">
        {daRivedere.slice(0, 8).map((c) => (
          <li key={c.id} className="flex items-center justify-between gap-2 text-[11px]">
            <span className="truncate">
              <b className="font-bold">{c.nome}</b>{' '}
              <span className="text-dim">({c.squadra})</span>{' '}
              <span style={{ color: c.daRivedere?.motivo === 'uscito' ? 'var(--color-danger)' : 'var(--color-amber)' }}>
                {TESTO_MOTIVO[c.daRivedere?.motivo ?? ''] ?? 'da controllare'}
                {c.daRivedere?.dettaglio ? `: ${c.daRivedere.dettaglio}` : ''}
              </span>
              {c.stato === 'obiettivo' && <span className="ml-[6px] text-gold">· è un tuo obiettivo</span>}
              {c.stato === 'acquistato' && <span className="ml-[6px] text-ok">· è già in rosa</span>}
            </span>
            <MiniPulsante onClick={() => segnaRivisto(c.id)} title="Segna come visto">
              <Check size={11} />
            </MiniPulsante>
          </li>
        ))}
      </ul>
      {daRivedere.length > 8 && (
        <p className="mt-[6px] text-[10px] text-dim">e altri {daRivedere.length - 8}.</p>
      )}
      <p className="mt-[7px] text-[10px] leading-[1.5] text-dim">
        La % di titolarità di chi ha cambiato squadra non è stata ricalcolata: l'app non ha modo di
        sapere quella giusta, il numero lo metti tu.
      </p>
    </section>
  );
}
