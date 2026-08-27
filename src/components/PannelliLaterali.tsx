/* I tre pannelli della colonna destra del listone:
   scarsita' (F8), chi puo' rilanciare (F7), analisi rosa (F9). */

import type { Calciatore } from '../types';
import { FASCE, RUOLI, RUOLO_COLORE } from '../domain/costanti';
import { prezzoConsigliato } from '../domain/budget';
import { chiPuoRilanciare } from '../domain/avversari';
import { useStore } from '../store/store';
import { useAnalisiRosa, useAvversariCalcolati, useScarsita } from '../store/derivati';
import { useUI } from '../store/ui';
import { Nota, Numero, Pannello } from '../ui/primitive';

const NOTA_SCARSITA =
  "Conta chi è ancora sul mercato (disponibili e tuoi obiettivi). In rosso le fasce alte rimaste sotto la domanda residua della lega: lì aspettare il giro dopo costa.";

/* ------------------------- F8 - quanti ne restano ------------------------- */

export function PannelloScarsita() {
  const tema = useUI((s) => s.tema);
  const scarsita = useScarsita();

  if (tema === 'grafite') {
    return (
      <section style={{ padding: '14px 18px', borderBottom: '1px solid var(--color-line)' }}>
        <h2
          style={{
            margin: '0 0 10px',
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: '.16em',
            textTransform: 'uppercase',
            color: '#8F8F8F',
          }}
        >
          Quanti ne restano
        </h2>
        <div className="grid" style={{ gap: '5px 4px', gridTemplateColumns: '26px repeat(4,1fr)' }}>
          <span />
          {FASCE.map((f) => (
            <span
              key={f}
              style={{ textAlign: 'right', fontSize: 9, textTransform: 'uppercase', letterSpacing: '.08em', color: '#8F8F8F' }}
              title={f}
            >
              {f === 'Terza fascia' ? '3ª' : f === 'Semi-top' ? 'Semi' : f === 'Scommessa' ? 'Scom.' : 'Top'}
            </span>
          ))}
          {RUOLI.map((r) => (
            <ContenutoRigaGrafite key={r} ruolo={r} scarsita={scarsita} />
          ))}
        </div>
        <p style={{ margin: '10px 0 0', fontSize: 10, lineHeight: 1.6, color: '#8F8F8F' }}>{NOTA_SCARSITA}</p>
      </section>
    );
  }

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
      <Nota>{NOTA_SCARSITA}</Nota>
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

function ContenutoRigaGrafite({
  ruolo,
  scarsita,
}: {
  ruolo: (typeof RUOLI)[number];
  scarsita: ReturnType<typeof useScarsita>;
}) {
  return (
    <>
      <span className="n" style={{ fontSize: 11, fontWeight: 700, color: RUOLO_COLORE[ruolo] }}>
        {ruolo}
      </span>
      {FASCE.map((f) => {
        const cella = scarsita.matrice[ruolo][f];
        return (
          <span
            key={f}
            className="n"
            style={{
              textAlign: 'right',
              fontSize: 12,
              fontWeight: cella.sottoDomanda ? 700 : 500,
              color: cella.sottoDomanda ? 'var(--color-danger)' : '#C4C4C4',
            }}
          >
            {cella.rimasti}
          </span>
        );
      })}
    </>
  );
}

/* ------------------------ F7 - chi puo' rilanciare ------------------------ */

export function PannelloRilanci({ selezionato }: { selezionato: Calciatore | null }) {
  const tema = useUI((s) => s.tema);
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

  if (tema === 'grafite') {
    const tutti = [...esito.possono, ...esito.fuori];
    const massimo = Math.max(...tutti.map((a) => a.maxOfferta), 1);
    return (
      <section style={{ padding: '14px 18px', borderBottom: '1px solid var(--color-line)' }}>
        <h2
          style={{
            margin: '0 0 8px',
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: '.16em',
            textTransform: 'uppercase',
            color: '#8F8F8F',
          }}
        >
          {selezionato ? `Chi può rilanciare · ${selezionato.nome}` : 'Chi può rilanciare'}
        </h2>
        {selezionato ? (
          <>
            <div className="flex items-baseline gap-[8px]">
              <span className="n" style={{ fontSize: 30, fontWeight: 500, lineHeight: 1 }}>
                {esito.possono.length}
                <span style={{ color: '#8F8F8F' }}>/{esito.totale}</span>
              </span>
              <span style={{ fontSize: 10, color: '#A8A8A8' }}>squadre, sopra {prezzo} crediti</span>
            </div>
            <ul style={{ margin: '12px 0 0', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column' }}>
              {tutti.map((a) => {
                const dentro = esito.possono.includes(a);
                const perc = Math.round((a.maxOfferta / massimo) * 100);
                return (
                  <li
                    key={a.id}
                    className="flex items-center gap-[10px]"
                    style={{ padding: '4px 0', fontSize: 11, color: dentro ? 'var(--color-chalk)' : '#8F8F8F', borderTop: '1px solid rgba(255,255,255,.06)' }}
                  >
                    <span className="flex-1 truncate">
                      {a.nome}
                      {a.datiParziali && <span style={{ color: 'var(--color-amber)' }}> ~</span>}
                    </span>
                    <span style={{ flex: '0 0 46px', height: 3, background: 'var(--color-line)' }}>
                      <span style={{ display: 'block', height: 3, background: dentro ? 'var(--color-gold)' : '#565656', width: `${perc}%` }} />
                    </span>
                    <span className="n whitespace-nowrap" style={{ width: 30, textAlign: 'right' }}>
                      {a.maxOfferta}
                    </span>
                  </li>
                );
              })}
            </ul>
            <p style={{ margin: '10px 0 0', fontSize: 10, lineHeight: 1.6, color: esito.stimaIncerta ? 'var(--color-amber)' : '#8F8F8F' }}>
              {esito.stimaIncerta
                ? 'Le squadre con ~ hanno acquisti registrati solo col conteggio rapido: i loro residui sono per eccesso.'
                : 'Stime sui dati che hai inserito tu: dove il tracciamento è parziale i residui sono per eccesso.'}
            </p>
          </>
        ) : (
          <p style={{ fontSize: 11, color: '#A8A8A8' }}>
            Seleziona un calciatore nel listone per vedere chi ha ancora la capienza per superarti.
          </p>
        )}
      </section>
    );
  }

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
  const tema = useUI((s) => s.tema);
  const analisi = useAnalisiRosa();

  if (tema === 'grafite') {
    return (
      <section style={{ padding: '14px 18px' }}>
        <h2
          style={{
            margin: '0 0 8px',
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: '.16em',
            textTransform: 'uppercase',
            color: '#8F8F8F',
          }}
        >
          Rosa
        </h2>
        {analisi.segnalazioni.length === 0 ? (
          <p style={{ fontSize: 11, color: '#A8A8A8' }}>
            Nessun acquisto ancora registrato: le constatazioni sulla rosa compaiono qui.
          </p>
        ) : (
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 7 }}>
            {analisi.segnalazioni.map((s) => (
              <li
                key={s.chiave}
                className="flex"
                style={{ gap: 8, fontSize: 11, lineHeight: 1.5, color: s.livello === 'attenzione' ? 'var(--color-amber)' : '#A8A8A8' }}
              >
                <span style={{ flex: '0 0 3px', background: s.livello === 'attenzione' ? 'var(--color-amber)' : 'var(--color-line)' }} />
                {s.testo}
              </li>
            ))}
          </ul>
        )}
        <p style={{ margin: '10px 0 0', fontSize: 10, lineHeight: 1.6, color: '#8F8F8F' }}>
          Sono constatazioni sulla rosa, non consigli su cosa comprare.
        </p>
      </section>
    );
  }

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
