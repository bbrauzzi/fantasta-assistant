/* Sotto i 1024px l'interfaccia non si adatta: è uno strumento operativo
   a densità alta, impilarlo in una colonna lo renderebbe inutilizzabile. */

export function SchermoPiccolo() {
  return (
    <div
      className="fixed inset-0 z-[60] hidden place-items-center p-[32px] text-center max-[1023px]:grid"
      style={{ background: 'var(--color-pitch)' }}
    >
      <div>
        <p
          className="font-bold uppercase"
          style={{ fontFamily: 'var(--font-cond)', fontSize: 26, letterSpacing: '.1em' }}
        >
          Apri su schermo più grande
        </p>
        <p className="mt-[10px] text-[13px] text-dim">
          FantAsta Assistant è pensato per un portatile: serve almeno 1024 px di larghezza.
        </p>
      </div>
    </div>
  );
}
