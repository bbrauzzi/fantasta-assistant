import { useConteggi } from '../store/derivati';
import { useUI } from '../store/ui';

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
  const tema = useUI((s) => s.tema);
  const conteggi = useConteggi();

  const voci: Array<{ id: Vista; etichetta: string; conteggio?: number }> = [
    { id: 'listone', etichetta: 'Listone' },
    { id: 'obiettivi', etichetta: 'Obiettivi', conteggio: conteggi.obiettivi },
    { id: 'rosa', etichetta: 'Rosa', conteggio: conteggi.rosa },
    { id: 'avversari', etichetta: 'Avversari' },
    { id: 'moduli', etichetta: 'Moduli' },
    { id: 'registro', etichetta: 'Registro' },
    { id: 'setup', etichetta: 'Setup' },
  ];

  if (tema === 'grafite') {
    return (
      <nav
        className="flex gap-[26px] px-[18px]"
        style={{ borderBottom: '1px solid var(--color-line)' }}
      >
        {voci.map((v) => {
          const attiva = v.id === vista;
          return (
            <button
              key={v.id}
              type="button"
              onClick={() => onCambia(v.id)}
              style={{
                padding: '11px 0 9px',
                fontSize: 12,
                fontWeight: attiva ? 700 : 500,
                letterSpacing: '.02em',
                color: attiva ? 'var(--color-chalk)' : 'var(--color-dim)',
                background: 'transparent',
                border: 'none',
                borderBottom: `2px solid ${attiva ? 'var(--color-gold)' : 'transparent'}`,
                cursor: 'pointer',
              }}
            >
              {v.etichetta}
              {v.conteggio !== undefined && (
                <span className="n" style={{ fontSize: 10, color: '#6A6A6A', marginLeft: 6 }}>
                  {v.conteggio}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    );
  }

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
            {v.conteggio !== undefined ? ` ${v.conteggio}` : ''}
          </button>
        );
      })}
    </nav>
  );
}
