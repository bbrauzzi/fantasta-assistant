/* La rosa che sto costruendo, con l'analisi di composizione (F9)
   e l'export di fine asta (F13). */

import { Download } from 'lucide-react';
import { RUOLI, RUOLO_LABEL, SOGLIA_TITOLARITA_DEBOLE } from '../domain/costanti';
import { useStore } from '../store/store';
import { useUI } from '../store/ui';
import { useAnalisiRosa, useStatoBudget } from '../store/derivati';
import { BadgeFascia, BadgeRig, BadgeRuolo, MiniPulsante, Nota, Numero, Pannello, Pulsante } from '../ui/primitive';

export function Rosa() {
  const config = useStore((s) => s.config);
  const annullaAcquisto = useStore((s) => s.annullaAcquisto);
  const setModale = useUI((s) => s.setModale);
  const st = useStatoBudget();
  const analisi = useAnalisiRosa();

  return (
    <div className="grid gap-[16px] px-[18px] py-[16px]" style={{ gridTemplateColumns: '1fr 330px' }}>
      <div className="grid gap-[12px]" style={{ gridTemplateColumns: 'repeat(2, minmax(0,1fr))' }}>
        {RUOLI.map((r) => {
          const gruppo = analisi.rosa
            .filter((c) => c.ruolo === r)
            .sort((a, b) => (b.prezzoPagato ?? 0) - (a.prezzoPagato ?? 0));
          const sforato = st.residuoPerRuolo[r] < 0;
          return (
            <Pannello
              key={r}
              titolo={`${RUOLO_LABEL[r]} — ${gruppo.length}/${config.slotPerRuolo[r]}`}
              azione={
                <span className="text-[10px] text-dim">
                  <b className="n" style={{ color: sforato ? 'var(--color-danger)' : 'var(--color-chalk)' }}>
                    {st.spesoPerRuolo[r]}
                  </b>{' '}
                  su {st.budgetPerRuolo[r]} pianificati
                </span>
              }
            >
              {gruppo.length === 0 ? (
                <p className="text-[11px] text-dim">Nessun acquisto.</p>
              ) : (
                <ul className="flex flex-col gap-[3px]">
                  {gruppo.map((c) => (
                    <li
                      key={c.id}
                      className="flex items-center gap-[8px] border-b border-line-soft py-[5px] last:border-0"
                    >
                      <BadgeRuolo ruolo={c.ruolo} dimensione={18} />
                      <b className="min-w-0 flex-1 truncate text-[12px] font-bold">{c.nome}</b>
                      <span className="w-[86px] truncate text-[11px] text-dim">{c.squadra}</span>
                      <BadgeFascia fascia={c.fascia} />
                      {c.rigorista && <BadgeRig incerto={c.rigoristaIncerto} />}
                      <Numero
                        valore={`${c.probTitolare}%`}
                        dimensione={11}
                        peso={500}
                        colore={c.probTitolare < SOGLIA_TITOLARITA_DEBOLE ? 'var(--color-amber)' : undefined}
                      />
                      <Numero valore={c.prezzoPagato ?? 0} dimensione={13} colore="var(--color-ok)" />
                      <MiniPulsante onClick={() => annullaAcquisto(c.id)} title="Annulla l'acquisto">
                        Annulla
                      </MiniPulsante>
                    </li>
                  ))}
                </ul>
              )}
            </Pannello>
          );
        })}
      </div>

      <aside className="flex flex-col gap-[12px]">
        <Pannello titolo="Totali">
          <div className="flex flex-col gap-[6px] text-[12px]">
            <Riga etichetta="Speso" valore={`${st.speso} / ${config.budgetTotale}`} />
            <Riga etichetta="Residui" valore={st.residui} colore={st.residui < 0 ? 'var(--color-danger)' : undefined} />
            <Riga etichetta="Max offerta" valore={st.maxOfferta} colore="var(--color-gold)" />
            <Riga etichetta="Slot" valore={`${st.slotRiempiti} / ${st.slotTotali}`} />
            {analisi.titolaritaMedia !== null && (
              <Riga
                etichetta="Titolarità media"
                valore={`${analisi.titolaritaMedia}%`}
                colore={
                  analisi.titolaritaMedia < SOGLIA_TITOLARITA_DEBOLE ? 'var(--color-amber)' : undefined
                }
              />
            )}
            <Riga etichetta="Rigoristi" valore={analisi.rigoristi} />
          </div>
        </Pannello>

        <Pannello titolo="Constatazioni">
          {analisi.segnalazioni.length === 0 ? (
            <p className="text-[11px] text-dim">Nessuna, per ora.</p>
          ) : (
            <ul className="flex flex-col gap-[4px]">
              {analisi.segnalazioni.map((s) => (
                <li
                  key={s.chiave}
                  className="text-[11px] leading-[1.4]"
                  style={{ color: s.livello === 'attenzione' ? 'var(--color-amber)' : 'var(--color-dim)' }}
                >
                  {s.testo}
                </li>
              ))}
            </ul>
          )}
          <Nota>Constatazioni, non consigli.</Nota>
        </Pannello>

        <Pannello titolo="Titolarità per ruolo">
          <div className="flex flex-col gap-[4px] text-[12px]">
            {RUOLI.map((r) => (
              <Riga
                key={r}
                etichetta={RUOLO_LABEL[r]}
                valore={
                  analisi.titolaritaPerRuolo[r] === null ? '—' : `${analisi.titolaritaPerRuolo[r]}%`
                }
              />
            ))}
          </div>
        </Pannello>

        <Pulsante
          variante="oro"
          onClick={() => setModale({ tipo: 'esporta' })}
          className="flex items-center justify-center gap-[6px]"
        >
          <Download size={13} /> Esporta la rosa
        </Pulsante>
      </aside>
    </div>
  );
}

function Riga({
  etichetta,
  valore,
  colore,
}: {
  etichetta: string;
  valore: string | number;
  colore?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-dim">{etichetta}</span>
      <Numero valore={valore} dimensione={13} colore={colore} />
    </div>
  );
}
