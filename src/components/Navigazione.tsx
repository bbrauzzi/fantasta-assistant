import { useConteggi } from '../store/derivati';

export type Vista =
  | 'listone'
  | 'obiettivi'
  | 'rosa'
  | 'avversari'
  | 'moduli'
  | 'registro'
  | 'setup';

export function Navigazione({
  vista,
  onCambia,
}: {
  vista: Vista;
  onCambia: (v: Vista) => void;
}) {
  const conteggi = useConteggi();

  const voci: Array<{ id: Vista; etichetta: string }> = [
    { id: 'listone', etichetta: 'Listone' },
    { id: 'obiettivi', etichetta: `Obiettivi ${conteggi.obiettivi}` },
    { id: 'rosa', etichetta: `Rosa ${conteggi.rosa}` },
    { id: 'avversari', etichetta: 'Avversari' },
    { id: 'moduli', etichetta: 'Moduli' },
    { id: 'registro', etichetta: 'Registro' },
    { id: 'setup', etichetta: 'Setup' },
  ];

  return (
    <nav className="flex gap-[5px] border-b border-line px-[18px] py-[9px]">
      {voci.map((v) => {
        const attiva = v.id === vista;
        return (
          <button
            key={v.id}
            type="button"
            onClick={() => onCambia(v.id)}
            className="rounded-[7px] px-[13px] py-[6px] text-[12px]"
            style={
              attiva
                ? { background: 'var(--color-gold)', color: 'var(--color-ink)', fontWeight: 700 }
                : { border: '1px solid var(--color-line)', fontWeight: 600 }
            }
          >
            {v.etichetta}
          </button>
        );
      })}
    </nav>
  );
}
