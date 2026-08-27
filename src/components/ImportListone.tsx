/* F1 + F14 - flusso di aggiornamento del listone in tre passi:
   1. scelta del file  2. mappatura delle colonne  3. referto e conferma.
   Nessuna riga viene scritta prima del passo 3. */

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, ExternalLink, FileUp } from 'lucide-react';
import type { MappaturaColonne, RefertoDiff, RigaGrezza, Differenza } from '../types';
import {
  CAMPI_IMPORT,
  CAMPO_OBBLIGATORIO,
  ETICHETTA_CAMPO,
  calcolaDiff,
  chiaveDifferenza,
  fileSembraParziale,
  interpretaRighe,
  mappaturaCompleta,
  proponiMappatura,
  totaleDifferenze,
  trovaRigaIntestazioni,
} from '../domain/listone';
import { useStore } from '../store/store';
import { leggiFile } from '../lib/file';
import { Nota, Pulsante, Selezione } from '../ui/primitive';
import { Modale } from '../ui/Modale';

type Passo = 'file' | 'mappatura' | 'referto';

const URL_QUOTAZIONI = 'https://www.fantacalcio.it/quotazioni-fantacalcio';

export function ImportListone({ onChiudi }: { onChiudi: () => void }) {
  const calciatori = useStore((s) => s.calciatori);
  const applicaReferto = useStore((s) => s.applicaReferto);

  const [passo, setPasso] = useState<Passo>('file');
  const [nomeFile, setNomeFile] = useState('');
  const [righe, setRighe] = useState<RigaGrezza[]>([]);
  const [conIntestazioni, setConIntestazioni] = useState(true);
  const [mappa, setMappa] = useState<MappaturaColonne>({});
  const [errore, setErrore] = useState<string | null>(null);
  const [caricando, setCaricando] = useState(false);
  const [escluse, setEscluse] = useState<Set<string>>(new Set());
  const [includiNuovi, setIncludiNuovi] = useState(true);
  const [mappaturaAutomatica, setMappaturaAutomatica] = useState(false);

  const intestazioni = useMemo(() => {
    if (righe.length === 0) return [];
    return conIntestazioni
      ? righe[0].celle
      : righe[0].celle.map((_, i) => `Colonna ${i + 1}`);
  }, [righe, conIntestazioni]);

  const righeDati = useMemo(
    () => (conIntestazioni ? righe.slice(1) : righe),
    [righe, conIntestazioni],
  );

  const referto: RefertoDiff | null = useMemo(() => {
    if (passo !== 'referto') return null;
    const esito = interpretaRighe(righeDati, mappa);
    return calcolaDiff(calciatori, esito.righe, esito.errori);
  }, [passo, righeDati, mappa, calciatori]);

  const parziale = referto ? fileSembraParziale(referto, calciatori.length) : false;

  /* Se il file copre solo una parte del listone, gli "usciti" partono
     deselezionati: e' quasi sempre un estratto, non mezzo campionato svincolato. */
  useEffect(() => {
    if (!referto || !parziale) return;
    setEscluse(new Set(referto.usciti.map(chiaveDifferenza)));
  }, [referto, parziale]);

  const scegliFile = async (file: File) => {
    setCaricando(true);
    setErrore(null);
    try {
      const letto = await leggiFile(file);
      if (letto.righe.length === 0) throw new Error('il file è vuoto');
      // Alcuni export (fantacalcio.it in testa) mettono una riga di titolo
      // sopra le intestazioni vere: si cercano nelle prime righe, non solo
      // nella prima, e si scarta tutto quello che le precede.
      const idxIntestazioni = trovaRigaIntestazioni(letto.righe);
      const conTeste = idxIntestazioni >= 0;
      const righeUtili = conTeste ? letto.righe.slice(idxIntestazioni) : letto.righe;
      const proposta = proponiMappatura(
        conTeste ? righeUtili[0].celle : righeUtili[0].celle.map(() => ''),
      );
      setNomeFile(letto.nomeFile);
      setRighe(righeUtili);
      setConIntestazioni(conTeste);
      setMappa(proposta);
      // Il tracciato del sito e' sempre lo stesso: se le intestazioni bastano
      // a riconoscere tutti i campi obbligatori, si salta dritti al referto.
      if (conTeste && mappaturaCompleta(proposta)) {
        setMappaturaAutomatica(true);
        setPasso('referto');
      } else {
        setMappaturaAutomatica(false);
        setPasso('mappatura');
      }
    } catch (e) {
      setErrore(`Non riesco a leggere il file: ${(e as Error).message}`);
    } finally {
      setCaricando(false);
    }
  };

  const mappaturaOk = mappaturaCompleta(mappa);

  const applica = () => {
    if (!referto) return;
    const selezionate = new Set(
      [
        ...referto.trasferimenti,
        ...referto.cambiRuolo,
        ...referto.quotazioni,
        ...referto.usciti,
        ...(includiNuovi ? referto.nuovi : []),
      ]
        .map(chiaveDifferenza)
        .filter((k) => !escluse.has(k)),
    );
    applicaReferto(referto, { selezionate, includiNuovi }, nomeFile);
    onChiudi();
  };

  return (
    <Modale
      titolo="Aggiorna listone"
      sottotitolo={
        passo === 'file'
          ? 'Il file lo scarichi tu dal sito: l’app non può collegarsi da sola.'
          : `${nomeFile} — ${righeDati.length} righe`
      }
      larghezza={860}
      onChiudi={onChiudi}
      piede={
        passo === 'mappatura' ? (
          <>
            <Pulsante variante="dim" onClick={() => setPasso('file')}>
              Indietro
            </Pulsante>
            <Pulsante
              variante="oro"
              disabled={!mappaturaOk}
              onClick={() => {
                setMappaturaAutomatica(false);
                setPasso('referto');
              }}
              className="flex items-center gap-[6px]"
            >
              Vedi il referto <ArrowRight size={13} />
            </Pulsante>
          </>
        ) : passo === 'referto' ? (
          <>
            <Pulsante
              variante="dim"
              onClick={() => {
                setMappaturaAutomatica(false);
                setPasso('mappatura');
              }}
            >
              Indietro
            </Pulsante>
            <Pulsante variante="oro" onClick={applica} disabled={!referto}>
              Applica {referto ? totaleDifferenze(referto) - escluse.size : 0} modifiche
            </Pulsante>
          </>
        ) : undefined
      }
    >
      {passo === 'file' && (
        <PassoFile onFile={scegliFile} caricando={caricando} errore={errore} />
      )}

      {passo === 'mappatura' && (
        <PassoMappatura
          intestazioni={intestazioni}
          anteprima={righeDati.slice(0, 3)}
          mappa={mappa}
          setMappa={setMappa}
          conIntestazioni={conIntestazioni}
          setConIntestazioni={setConIntestazioni}
          completa={mappaturaOk}
        />
      )}

      {passo === 'referto' && referto && (
        <PassoReferto
          referto={referto}
          parziale={parziale}
          quantiInListone={calciatori.length}
          escluse={escluse}
          setEscluse={setEscluse}
          includiNuovi={includiNuovi}
          setIncludiNuovi={setIncludiNuovi}
          mappaturaAutomatica={mappaturaAutomatica}
        />
      )}
    </Modale>
  );
}

/* ------------------------------- passo 1 ------------------------------- */

function PassoFile({
  onFile,
  caricando,
  errore,
}: {
  onFile: (f: File) => void;
  caricando: boolean;
  errore: string | null;
}) {
  return (
    <>
      <ol className="flex flex-col gap-[10px] text-[13px] leading-[1.6]">
        <li>
          <b>1.</b> Scarica il file delle quotazioni aggiornate (CSV o XLSX) dal sito ufficiale.{' '}
          <a
            href={URL_QUOTAZIONI}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-[4px] font-bold text-gold underline"
          >
            Quotazioni Fantacalcio.it <ExternalLink size={11} />
          </a>
        </li>
        <li>
          <b>2.</b> Caricalo qui sotto: ti mostro cosa cambierebbe <i>prima</i> di toccare qualsiasi
          cosa.
        </li>
      </ol>

      <label
        className="mt-[16px] flex cursor-pointer flex-col items-center gap-[8px] rounded-[10px] border border-dashed border-line px-[18px] py-[28px] text-center"
        style={{ background: 'rgba(0,0,0,.22)' }}
      >
        <FileUp size={22} className="text-gold" />
        <span className="text-[13px] font-bold">
          {caricando ? 'Sto leggendo il file…' : 'Scegli un file CSV o XLSX'}
        </span>
        <span className="text-[11px] text-dim">Il tracciato può cambiare: le colonne le mappi tu al passo dopo.</span>
        <input
          type="file"
          accept=".csv,.xlsx,.xls,text/csv"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile(f);
            e.target.value = '';
          }}
        />
      </label>

      {errore && <p className="mt-[12px] text-[12px] text-danger">{errore}</p>}

      <Nota tono="amber">
        L'app gira nel browser e non esiste un'API pubblica di Fantacalcio.it: non può scaricare il
        listone da sola, e un tentativo di scraping verrebbe bloccato dalle policy CORS. Il file lo
        scarichi tu, l'app lo assorbe e ti dice cosa è cambiato.
      </Nota>
    </>
  );
}

/* ------------------------------- passo 2 ------------------------------- */

function PassoMappatura({
  intestazioni,
  anteprima,
  mappa,
  setMappa,
  conIntestazioni,
  setConIntestazioni,
  completa,
}: {
  intestazioni: string[];
  anteprima: RigaGrezza[];
  mappa: MappaturaColonne;
  setMappa: (m: MappaturaColonne) => void;
  conIntestazioni: boolean;
  setConIntestazioni: (v: boolean) => void;
  completa: boolean;
}) {
  return (
    <>
      <label className="mb-[12px] flex cursor-pointer items-center gap-[7px] text-[12px]">
        <input
          type="checkbox"
          checked={conIntestazioni}
          onChange={(e) => setConIntestazioni(e.target.checked)}
        />
        La prima riga contiene le intestazioni
      </label>

      <div className="grid gap-[8px]" style={{ gridTemplateColumns: '150px 1fr' }}>
        {CAMPI_IMPORT.map((campo) => (
          <div key={campo} className="contents">
            <label className="self-center text-[12px]">
              {ETICHETTA_CAMPO[campo]}
              {CAMPO_OBBLIGATORIO[campo] && <span className="text-gold"> *</span>}
            </label>
            <Selezione
              value={mappa[campo] ?? ''}
              onChange={(e) =>
                setMappa({ ...mappa, [campo]: e.target.value === '' ? null : Number(e.target.value) })
              }
              aria-label={`Colonna per ${ETICHETTA_CAMPO[campo]}`}
            >
              <option value="">— non presente nel file —</option>
              {intestazioni.map((h, i) => (
                <option key={i} value={i}>
                  {h || `Colonna ${i + 1}`}
                  {anteprima[0]?.celle[i] ? `  (es. ${anteprima[0].celle[i]})` : ''}
                </option>
              ))}
            </Selezione>
          </div>
        ))}
      </div>

      {!completa && (
        <p className="mt-[12px] text-[12px] text-amber">
          Nome, squadra, ruolo e quotazione sono obbligatori: senza quelli non posso interpretare le
          righe.
        </p>
      )}

      <h3 className="titolo-pannello mt-[18px] mb-[7px]">Anteprima delle prime righe</h3>
      <div className="overflow-x-auto rounded-[8px] border border-line">
        <table className="w-full text-[11px]">
          <thead>
            <tr>
              {intestazioni.map((h, i) => (
                <th
                  key={i}
                  className="whitespace-nowrap px-[8px] py-[5px] text-left text-[9px] uppercase text-dim"
                  style={{ background: 'rgba(0,0,0,.24)', letterSpacing: '.1em' }}
                >
                  {h || `Col ${i + 1}`}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {anteprima.map((r) => (
              <tr key={r.numeroRiga}>
                {intestazioni.map((_, i) => (
                  <td key={i} className="whitespace-nowrap border-t border-line-soft px-[8px] py-[4px]">
                    {r.celle[i] ?? ''}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Nota>
        Se la fascia non è nel file, viene dedotta dalla quotazione ed è modificabile a mano. La %
        di titolarità mancante parte da 70: mettila tu dove conta.
      </Nota>
    </>
  );
}

/* ------------------------------- passo 3 ------------------------------- */

function PassoReferto({
  referto,
  parziale,
  quantiInListone,
  escluse,
  setEscluse,
  includiNuovi,
  setIncludiNuovi,
  mappaturaAutomatica,
}: {
  referto: RefertoDiff;
  parziale: boolean;
  quantiInListone: number;
  escluse: Set<string>;
  setEscluse: (s: Set<string>) => void;
  includiNuovi: boolean;
  setIncludiNuovi: (v: boolean) => void;
  mappaturaAutomatica: boolean;
}) {
  const alterna = (k: string) => {
    const n = new Set(escluse);
    if (n.has(k)) n.delete(k);
    else n.add(k);
    setEscluse(n);
  };

  const obiettiviUsciti = referto.usciti.filter((d) => d.miRiguarda);

  return (
    <>
      {mappaturaAutomatica && (
        <Nota>
          Colonne riconosciute automaticamente dalle intestazioni del file. Se qualcosa non
          torna, torna indietro per controllare o correggere la mappatura.
        </Nota>
      )}

      <div className="mb-[14px] flex flex-wrap gap-[16px] text-[12px]">
        <Contatore etichetta="righe lette" valore={referto.righeLette} />
        <Contatore etichetta="trasferimenti" valore={referto.trasferimenti.length} colore="var(--color-gold)" />
        <Contatore etichetta="nuovi" valore={referto.nuovi.length} />
        <Contatore etichetta="usciti" valore={referto.usciti.length} colore={obiettiviUsciti.length > 0 ? 'var(--color-danger)' : undefined} />
        <Contatore etichetta="quotazioni cambiate" valore={referto.quotazioni.length} />
        <Contatore etichetta="cambi di ruolo" valore={referto.cambiRuolo.length} />
        <Contatore etichetta="invariati" valore={referto.invariati} />
        <Contatore etichetta="righe scartate" valore={referto.errori.length} colore={referto.errori.length > 0 ? 'var(--color-amber)' : undefined} />
      </div>

      {parziale && (
        <p
          className="mb-[14px] flex items-start gap-[7px] rounded-[8px] border px-[11px] py-[9px] text-[12px] leading-[1.6]"
          style={{ borderColor: 'var(--color-amber)', color: 'var(--color-amber)' }}
        >
          <AlertTriangle size={14} className="mt-[1px] shrink-0" />
          <span>
            Il file contiene {referto.righeLette} calciatori a fronte di {quantiInListone} nel tuo
            listone: sembra un estratto, non il listone completo. Gli «usciti» sono stati
            deselezionati — è più probabile che manchino dal file che dal campionato. Se invece è il
            listone intero, riselezionali qui sotto.
          </span>
        </p>
      )}

      {obiettiviUsciti.length > 0 && (
        <p
          className="mb-[14px] flex items-start gap-[7px] rounded-[8px] border px-[11px] py-[9px] text-[12px] leading-[1.5]"
          style={{ borderColor: 'var(--color-danger)', color: 'var(--color-danger)' }}
        >
          <AlertTriangle size={14} className="mt-[1px] shrink-0" />
          <span>
            {obiettiviUsciti.length} calciator{obiettiviUsciti.length === 1 ? 'e che ti riguarda non è' : 'i che ti riguardano non sono'}{' '}
            più nel listone: {obiettiviUsciti.map((d) => d.nome).join(', ')}. Restano nella tua lista,
            ma marcati.
          </span>
        </p>
      )}

      <Sezione
        titolo="Trasferimenti"
        descrizione="Chi ha cambiato squadra: è l'informazione per cui stai aggiornando."
        voci={referto.trasferimenti}
        escluse={escluse}
        onAlterna={alterna}
        rendi={(d) => (
          <>
            <span className="text-dim">{d.squadraPrec}</span> → <b className="text-gold">{d.squadra}</b>
          </>
        )}
      />

      <Sezione
        titolo="Cambi di ruolo"
        descrizione="Un esterno che passa da attaccante a centrocampista cambia parecchio il suo valore."
        voci={referto.cambiRuolo}
        escluse={escluse}
        onAlterna={alterna}
        rendi={(d) => (
          <>
            <span className="text-dim">{d.ruoloPrec}</span> → <b>{d.ruolo}</b>
          </>
        )}
      />

      <Sezione
        titolo="Quotazioni cambiate"
        descrizione="Ordinate per variazione assoluta decrescente."
        voci={referto.quotazioni}
        escluse={escluse}
        onAlterna={alterna}
        limite={40}
        rendi={(d) => (
          <>
            <span className="n text-dim">{d.quotazionePrec}</span> →{' '}
            <b className="n">{d.quotazioneBase}</b>{' '}
            <span
              className="n"
              style={{ color: (d.delta ?? 0) > 0 ? 'var(--color-ok)' : 'var(--color-danger)' }}
            >
              ({(d.delta ?? 0) > 0 ? '+' : ''}
              {d.delta} · {(d.deltaPerc ?? 0) > 0 ? '+' : ''}
              {d.deltaPerc}%)
            </span>
          </>
        )}
      />

      <Sezione
        titolo="Usciti"
        descrizione="Non vengono cancellati: potresti averli in rosa o fra gli obiettivi. Vengono marcati."
        voci={referto.usciti}
        escluse={escluse}
        onAlterna={alterna}
        limite={30}
        rendi={() => <span className="text-dim">non è più nel file</span>}
      />

      <section className="mt-[14px]">
        <label className="flex cursor-pointer items-center gap-[7px] text-[12px]">
          <input
            type="checkbox"
            checked={includiNuovi}
            onChange={(e) => setIncludiNuovi(e.target.checked)}
          />
          Aggiungi i {referto.nuovi.length} nuovi arrivi al listone
        </label>
        {includiNuovi && referto.nuovi.length > 0 && (
          <p className="mt-[6px] text-[11px] text-dim">
            {referto.nuovi.slice(0, 12).map((d) => `${d.nome} (${d.squadra})`).join(' · ')}
            {referto.nuovi.length > 12 && ` e altri ${referto.nuovi.length - 12}`}
          </p>
        )}
      </section>

      {referto.errori.length > 0 && (
        <section className="mt-[16px]">
          <h3 className="titolo-pannello mb-[6px]" style={{ color: 'var(--color-amber)' }}>
            Righe che non tornano — {referto.errori.length}
          </h3>
          <ul className="flex max-h-[160px] flex-col gap-[3px] overflow-y-auto text-[11px]">
            {referto.errori.slice(0, 60).map((e) => (
              <li key={e.numeroRiga} className="text-dim">
                <span className="n text-amber">riga {e.numeroRiga}</span> — {e.motivo}:{' '}
                <span className="opacity-70">{e.contenuto.slice(0, 90)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Nota>
        Le tue decisioni non vengono toccate: stato, note, prezzo pagato, posizione negli obiettivi e
        i campi che hai modificato a mano restano come sono. Prima di applicare viene salvato uno
        snapshot, così puoi tornare indietro.
      </Nota>
    </>
  );
}

function Contatore({
  etichetta,
  valore,
  colore,
}: {
  etichetta: string;
  valore: number;
  colore?: string;
}) {
  return (
    <span className="flex flex-col">
      <b className="n text-[20px] font-bold" style={{ color: colore }}>
        {valore}
      </b>
      <span className="text-[10px] uppercase text-dim" style={{ letterSpacing: '.08em' }}>
        {etichetta}
      </span>
    </span>
  );
}

function Sezione({
  titolo,
  descrizione,
  voci,
  escluse,
  onAlterna,
  rendi,
  limite = 60,
}: {
  titolo: string;
  descrizione: string;
  voci: Differenza[];
  escluse: Set<string>;
  onAlterna: (k: string) => void;
  rendi: (d: Differenza) => React.ReactNode;
  limite?: number;
}) {
  if (voci.length === 0) return null;
  return (
    <section className="mb-[14px]">
      <h3 className="titolo-pannello mb-[2px]">
        {titolo} — {voci.length}
      </h3>
      <p className="mb-[6px] text-[10px] text-dim">{descrizione}</p>
      <ul className="flex max-h-[190px] flex-col gap-[2px] overflow-y-auto">
        {voci.slice(0, limite).map((d) => {
          const k = chiaveDifferenza(d);
          const esclusa = escluse.has(k);
          return (
            <li key={k}>
              <label
                className="flex cursor-pointer items-center gap-[8px] rounded-[5px] px-[6px] py-[3px] text-[12px]"
                style={{ opacity: esclusa ? 0.4 : 1, background: d.miRiguarda ? 'rgba(212,175,55,.08)' : undefined }}
              >
                <input type="checkbox" checked={!esclusa} onChange={() => onAlterna(k)} />
                <b className="w-[150px] shrink-0 truncate font-bold">{d.nome}</b>
                <span className="flex-1 truncate">{rendi(d)}</span>
                {d.miRiguarda && <span className="shrink-0 text-[10px] text-gold">ti riguarda</span>}
              </label>
            </li>
          );
        })}
        {voci.length > limite && (
          <li className="px-[6px] text-[10px] text-dim">e altre {voci.length - limite} voci, incluse nell'applicazione.</li>
        )}
      </ul>
    </section>
  );
}
