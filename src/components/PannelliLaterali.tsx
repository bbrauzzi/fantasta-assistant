/* I tre pannelli della colonna destra del listone:
   scarsita' (F8), chi puo' rilanciare (F7), analisi rosa (F9). */

import type { Calciatore } from '../types';
import { FASCE, RUOLI } from '../domain/costanti';
import { prezzoConsigliato } from '../domain/budget';
import { chiPuoRilanciare } from '../domain/avversari';
import { useStore } from '../store/store';
import { useAnalisiRosa, useAvversariCalcolati, useScarsita } from '../store/derivati';
import { useUI } from '../store/ui';
import { Nota, Numero, Pannello } from '../ui/primitive';

/* ------------------------- F8 - quanti ne restano ------------------------- */

export function PannelloScarsita() {
  const scarsita = useScarsita();

  return (
    <Pannello titolo="Quanti ne restano">
      <div className="grid gap-[4px]" style={{ gridTemplateColumns: '26px repeat(4,1fr)' }}>
        <span />
        {FASCE.map((f) => (
          <span key={f} className="text-center text-[9px] uppercase text-dim" title={f}>
            {f === 'Terza fascia' ? '3ª' : f === 'Semi-top' ? 'Semi' : f === 'Scommessa' ? 'Scom.' : 'Top'}
          </span>
        ))}
        {RUOLI.map((r) => (
          <ContenutoRiga key={r} ruolo={r} scarsita={scarsita} />
        ))}
      </div>
      <Nota>
        Conta chi è ancora sul mercato (disponibili e tuoi obiettivi). In rosso le fasce alte
        rimaste sotto la domanda residua della lega: lì aspettare il giro dopo costa.
      </Nota>
    </Pannello>
  );
}

function ContenutoRiga({
  ruolo,
  scarsita,
}: {
  ruolo: (typeof RUOLI)[number];
  scarsita: ReturnType<typeof useScarsita>;
}) {
  return (
    <>
      <span className="text-[11px] font-bold text-dim">{ruolo}</span>
      {FASCE.map((f) => {
        const cella = scarsita.matrice[ruolo][f];
        return (
          <span key={f} className="text-center">
            <Numero
              valore={cella.rimasti}
              dimensione={12}
              peso={cella.sottoDomanda ? 700 : 500}
              colore={cella.sottoDomanda ? 'var(--color-danger)' : undefined}
            />
          </span>
        );
      })}
    </>
  );
}

/* ------------------------ F7 - chi puo' rilanciare ------------------------ */

export function PannelloRilanci({ selezionato }: { selezionato: Calciatore | null }) {
  const config = useStore((s) => s.config);
  const avversari = useAvversariCalcolati();
  // se sto gia' digitando un'offerta e' quella la soglia che mi interessa,
  // altrimenti uso il prezzo consigliato come riferimento
  const bozza = useUI((s) => (selezionato ? (s.bozze[selezionato.id] ?? '') : ''));

  const offerta = bozza === '' ? null : Number(bozza);
  const prezzo =
    offerta !== null && Number.isFinite(offerta)
      ? offerta
      : selezionato
        ? prezzoConsigliato(selezionato.quotazioneBase, config)
        : 0;
  const esito = chiPuoRilanciare(avversari, prezzo, selezionato?.ruolo);

  return (
    <Pannello
      titolo={selezionato ? `Chi può rilanciare su ${selezionato.nome}` : 'Chi può rilanciare'}
    >
      {selezionato ? (
        <>
          <div className="flex items-baseline gap-[8px]">
            <Numero valore={`${esito.possono.length} su ${esito.totale}`} dimensione={30} />
            <span className="text-[10px] text-dim">squadre, sopra {prezzo} crediti</span>
          </div>
          <ul className="mt-[9px] flex flex-col gap-[3px]">
            {[...esito.possono, ...esito.fuori].map((a) => {
              const dentro = esito.possono.includes(a);
              return (
                <li
                  key={a.id}
                  className="flex items-center justify-between text-[11px]"
                  style={{ color: dentro ? 'var(--color-chalk)' : 'var(--color-dim)' }}
                >
                  <span className="truncate">
                    {a.nome}
                    {a.datiParziali && <span className="text-amber"> ~</span>}
                  </span>
                  <span className="n whitespace-nowrap">
                    {a.maxOfferta}
                    {!dentro && <span className="text-dim"> · fuori</span>}
                  </span>
                </li>
              );
            })}
          </ul>
          <Nota tono={esito.stimaIncerta ? 'amber' : 'dim'}>
            {esito.stimaIncerta
              ? 'Le squadre con ~ hanno acquisti registrati solo col conteggio rapido: i loro residui sono per eccesso.'
              : 'Stime sui dati che hai inserito tu: dove il tracciamento è parziale i residui sono per eccesso.'}
          </Nota>
        </>
      ) : (
        <p className="text-[11px] text-dim">
          Seleziona un calciatore nel listone per vedere chi ha ancora la capienza per superarti.
        </p>
      )}
    </Pannello>
  );
}

/* --------------------------- F9 - analisi rosa --------------------------- */

export function PannelloRosa() {
  const analisi = useAnalisiRosa();

  return (
    <Pannello titolo="Rosa">
      {analisi.segnalazioni.length === 0 ? (
        <p className="text-[11px] text-dim">
          Nessun acquisto ancora registrato: le constatazioni sulla rosa compaiono qui.
        </p>
      ) : (
        <ul className="flex flex-col gap-[4px]">
          {analisi.segnalazioni.map((s) => (
            <li
              key={s.chiave}
              className="text-[11px] leading-[1.4]"
              style={{
                color: s.livello === 'attenzione' ? 'var(--color-amber)' : 'var(--color-dim)',
              }}
            >
              {s.testo}
            </li>
          ))}
        </ul>
      )}
      <Nota>Sono constatazioni sulla rosa, non consigli su cosa comprare.</Nota>
    </Pannello>
  );
}
