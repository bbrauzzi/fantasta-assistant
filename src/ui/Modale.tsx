import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';

export function Modale({
  titolo,
  sottotitolo,
  larghezza = 560,
  onChiudi,
  children,
  piede,
}: {
  titolo: string;
  sottotitolo?: string;
  larghezza?: number;
  onChiudi: () => void;
  children: ReactNode;
  piede?: ReactNode;
}) {
  const rif = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const primo = rif.current?.querySelector<HTMLElement>(
      'input,select,button,textarea,[tabindex]:not([tabindex="-1"])',
    );
    primo?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onChiudi();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onChiudi]);

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center p-[24px]"
      style={{ background: 'rgba(4,20,14,.72)' }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onChiudi();
      }}
    >
      <div
        ref={rif}
        role="dialog"
        aria-modal="true"
        aria-label={titolo}
        className="flex max-h-[86vh] w-full flex-col overflow-hidden rounded-[12px] border border-line"
        style={{ maxWidth: larghezza, background: 'var(--color-pitch)' }}
      >
        <header className="flex items-start justify-between gap-3 border-b border-line px-[18px] py-[13px]">
          <div>
            <h2
              className="font-bold uppercase"
              style={{ fontFamily: 'var(--font-cond)', fontSize: 18, letterSpacing: '.08em' }}
            >
              {titolo}
            </h2>
            {sottotitolo && <p className="mt-[3px] text-[11px] text-dim">{sottotitolo}</p>}
          </div>
          <button type="button" onClick={onChiudi} aria-label="Chiudi" className="text-dim">
            <X size={18} />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-[18px] py-[14px]">{children}</div>
        {piede && (
          <footer className="flex items-center justify-end gap-[8px] border-t border-line px-[18px] py-[12px]">
            {piede}
          </footer>
        )}
      </div>
    </div>
  );
}
