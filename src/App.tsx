import { useEffect } from 'react';
import { BarraStato } from './components/BarraStato';
import { Navigazione } from './components/Navigazione';
import { Listone } from './components/Listone';
import { Obiettivi } from './components/Obiettivi';
import { Rosa } from './components/Rosa';
import { Avversari } from './components/Avversari';
import { Moduli } from './components/Moduli';
import { Registro } from './components/Registro';
import { Setup } from './components/Setup';
import { AstaRapida } from './components/AstaRapida';
import { ModaleAssegna } from './components/ModaleAssegna';
import { ModaleAiuto, ModaleConfermaAcquisto, ModaleNuovoCalciatore } from './components/ModaliVarie';
import { ImportListone } from './components/ImportListone';
import { EsportaFineAsta } from './components/EsportaFineAsta';
import { SchermoPiccolo } from './components/SchermoPiccolo';
import { useScorciatoie } from './hooks/useScorciatoie';
import { useUI } from './store/ui';

export default function App() {
  useScorciatoie();

  const tema = useUI((s) => s.tema);
  const vista = useUI((s) => s.vista);
  const setVista = useUI((s) => s.setVista);
  const astaRapida = useUI((s) => s.astaRapida);
  const setAstaRapida = useUI((s) => s.setAstaRapida);
  const modale = useUI((s) => s.modale);
  const setModale = useUI((s) => s.setModale);
  const chiudiModale = useUI((s) => s.chiudiModale);

  // il titolo della finestra dice a colpo d'occhio dove sono
  useEffect(() => {
    document.title = astaRapida ? 'Asta rapida — FantAsta' : 'FantAsta Assistant';
  }, [astaRapida]);

  // il tema e' una preferenza di UI: si applica sul root, non nell'undo/redo
  useEffect(() => {
    document.documentElement.dataset.tema = tema;
  }, [tema]);

  return (
    <>
      <SchermoPiccolo />

      {/* --altezza-testata: quanto occupano barra di stato e navigazione.
          Le viste che devono stare in una schermata la sottraggono a 100vh. */}
      <div className="min-h-full min-w-[1024px]" style={{ ['--altezza-testata' as string]: '158px' }}>
        {astaRapida ? (
          <AstaRapida onChiudi={() => setAstaRapida(false)} />
        ) : (
          <>
            <BarraStato
              onAstaRapida={() => setAstaRapida(true)}
              onAiuto={() => setModale({ tipo: 'aiuto' })}
            />
            <Navigazione vista={vista} onCambia={setVista} />
            <main>
              {vista === 'listone' && <Listone />}
              {vista === 'obiettivi' && <Obiettivi />}
              {vista === 'rosa' && <Rosa />}
              {vista === 'avversari' && <Avversari />}
              {vista === 'moduli' && <Moduli />}
              {vista === 'registro' && <Registro />}
              {vista === 'setup' && <Setup />}
            </main>
          </>
        )}
      </div>

      {modale.tipo === 'aiuto' && <ModaleAiuto onChiudi={chiudiModale} />}
      {modale.tipo === 'assegna' && (
        <ModaleAssegna calciatore={modale.calciatore} onChiudi={chiudiModale} />
      )}
      {modale.tipo === 'conferma-acquisto' && (
        <ModaleConfermaAcquisto
          calciatore={modale.calciatore}
          prezzo={modale.prezzo}
          motivo={modale.motivo}
          onChiudi={chiudiModale}
        />
      )}
      {modale.tipo === 'nuovo-calciatore' && <ModaleNuovoCalciatore onChiudi={chiudiModale} />}
      {modale.tipo === 'import' && <ImportListone onChiudi={chiudiModale} />}
      {modale.tipo === 'esporta' && <EsportaFineAsta onChiudi={chiudiModale} />}
    </>
  );
}
