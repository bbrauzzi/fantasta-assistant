/* F13 - export di fine asta. */

import { useState } from 'react';
import { Copy, Download } from 'lucide-react';
import { NOTA_NIENTE_API, riepilogoTestuale, rosaInCsv, rosaInJson } from '../domain/esporta';
import { useStore } from '../store/store';
import { useAnalisiRosa, useStatoBudget } from '../store/derivati';
import { dataPerNomeFile, scarica } from '../lib/file';
import { Pulsante } from '../ui/primitive';
import { Modale } from '../ui/Modale';

export function EsportaFineAsta({ onChiudi }: { onChiudi: () => void }) {
  const config = useStore((s) => s.config);
  const st = useStatoBudget();
  const { rosa } = useAnalisiRosa();
  const [copiato, setCopiato] = useState(false);

  const riepilogo = riepilogoTestuale(rosa, config, st);

  return (
    <Modale
      titolo="Esporta la rosa"
      sottotitolo={`${rosa.length} calciatori, ${st.speso} crediti spesi, ${st.residui} avanzati.`}
      larghezza={640}
      onChiudi={onChiudi}
      piede={
        <Pulsante variante="dim" onClick={onChiudi}>
          Chiudi
        </Pulsante>
      }
    >
      <div className="flex flex-wrap gap-[8px]">
        <Pulsante
          variante="oro"
          className="flex items-center gap-[6px]"
          onClick={() =>
            scarica(rosaInCsv(rosa), `rosa-${dataPerNomeFile()}.csv`, 'text/csv;charset=utf-8')
          }
        >
          <Download size={13} /> CSV (Ruolo;Nome;Squadra;Prezzo)
        </Pulsante>
        <Pulsante
          variante="fantasma"
          className="flex items-center gap-[6px]"
          onClick={() =>
            scarica(
              rosaInJson(rosa, config, st),
              `rosa-${dataPerNomeFile()}.json`,
              'application/json',
            )
          }
        >
          <Download size={13} /> JSON completo
        </Pulsante>
        <Pulsante
          variante="fantasma"
          className="flex items-center gap-[6px]"
          onClick={async () => {
            await navigator.clipboard.writeText(riepilogo);
            setCopiato(true);
            setTimeout(() => setCopiato(false), 2000);
          }}
        >
          <Copy size={13} /> {copiato ? 'Copiato' : 'Copia il riepilogo'}
        </Pulsante>
      </div>

      <p
        className="mt-[14px] rounded-[8px] border px-[11px] py-[9px] text-[11px] leading-[1.6]"
        style={{ borderColor: 'var(--color-amber)', color: 'var(--color-amber)' }}
      >
        {NOTA_NIENTE_API}
      </p>

      <pre
        className="n mt-[14px] max-h-[280px] overflow-auto rounded-[8px] border border-line px-[12px] py-[10px] text-[11px] leading-[1.5]"
        style={{ background: 'rgba(0,0,0,.3)' }}
      >
        {riepilogo}
      </pre>
    </Modale>
  );
}
