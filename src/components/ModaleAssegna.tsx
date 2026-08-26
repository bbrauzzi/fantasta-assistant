/* F7 - "preso da un avversario": a chi è andato e a quanto.
   Entrambi i campi sono facoltativi: in asta spesso non c'è tempo. */

import { useState } from 'react';
import type { Calciatore } from '../types';
import { prezzoConsigliato } from '../domain/budget';
import { useStore } from '../store/store';
import { useAvversariCalcolati } from '../store/derivati';
import { Campo, Pulsante } from '../ui/primitive';
import { Modale } from '../ui/Modale';

export function ModaleAssegna({ calciatore, onChiudi }: { calciatore: Calciatore; onChiudi: () => void }) {
  const config = useStore((s) => s.config);
  const segnaPerso = useStore((s) => s.segnaPerso);
  const avversari = useAvversariCalcolati();

  const consigliato = prezzoConsigliato(calciatore.quotazioneBase, config);
  const [prezzo, setPrezzo] = useState('');
  const [avversarioId, setAvversarioId] = useState<string | null>(null);

  const conferma = () => {
    const p = prezzo === '' ? null : Number(prezzo);
    segnaPerso(calciatore.id, avversarioId, Number.isFinite(p as number) ? p : null);
    onChiudi();
  };

  return (
    <Modale
      titolo={`${calciatore.nome} → avversario`}
      sottotitolo="Se non sai a chi o a quanto, conferma e basta: il calciatore esce comunque dal mercato."
      larghezza={520}
      onChiudi={onChiudi}
      piede={
        <>
          <Pulsante variante="dim" onClick={onChiudi}>
            Annulla
          </Pulsante>
          <Pulsante variante="oro" onClick={conferma}>
            Conferma
          </Pulsante>
        </>
      }
    >
      <label className="titolo-pannello mb-[6px] block">Prezzo di aggiudicazione</label>
      <Campo
        value={prezzo}
        onChange={(e) => setPrezzo(e.target.value.replace(/[^0-9]/g, ''))}
        onKeyDown={(e) => e.key === 'Enter' && conferma()}
        placeholder={`consigliato ${consigliato}`}
        inputMode="numeric"
        className="n w-[120px] text-center"
      />

      <label className="titolo-pannello mt-[16px] mb-[6px] block">A chi è andato</label>
      <div className="flex flex-wrap gap-[6px]">
        <button
          type="button"
          onClick={() => setAvversarioId(null)}
          className="rounded-[7px] border px-[11px] py-[7px] text-[12px]"
          style={{
            borderColor: avversarioId === null ? 'var(--color-gold)' : 'var(--color-line)',
            color: avversarioId === null ? 'var(--color-gold)' : 'var(--color-dim)',
          }}
        >
          Non lo so
        </button>
        {avversari.map((a) => {
          const attivo = a.id === avversarioId;
          const saturo = a.ruoliSaturi.includes(calciatore.ruolo);
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => setAvversarioId(a.id)}
              className="rounded-[7px] border px-[11px] py-[7px] text-left text-[12px]"
              style={{
                borderColor: attivo ? 'var(--color-gold)' : 'var(--color-line)',
                background: attivo ? 'rgba(212,175,55,.12)' : undefined,
              }}
            >
              {a.nome}
              <span className="ml-[6px] n text-[10px] text-dim">
                max {a.maxOfferta}
                {saturo && ' · saturo'}
              </span>
            </button>
          );
        })}
      </div>
      <p className="mt-[14px] text-[10px] leading-[1.5] text-dim">
        Indicare avversario e prezzo rende precise le stime del tracker. Se salti questo passaggio,
        i residui degli avversari restano approssimati per eccesso.
      </p>
    </Modale>
  );
}
