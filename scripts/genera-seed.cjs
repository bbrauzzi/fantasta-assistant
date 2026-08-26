/* ============================================================
   Genera src/data/listone-seed.ts dal file ufficiale delle
   quotazioni, incrociandolo con le liste di rigoristi e
   tiratori di punizioni raccolte a mano.

   Uso:  node scripts/genera-seed.cjs <percorso-del-file.xlsx>

   Da rilanciare quando esce un listino aggiornato. Le liste dei
   rigoristi stanno in scripts/rigoristi-2026-27.cjs e vanno
   riviste a mano: nessuna fonte le espone in modo automatico.
   ============================================================ */

const XLSX = require('xlsx');
const { writeFileSync } = require('node:fs');
const SPECIALISTI = require('./rigoristi-2026-27.cjs');

const percorso = process.argv[2];
if (!percorso) {
  console.error('Manca il percorso del file XLSX.');
  process.exit(1);
}

/* --------------------------- normalizzazione --------------------------- */

const SOSTITUZIONI = [[/ø/g,'o'],[/æ/g,'ae'],[/œ/g,'oe'],[/ß/g,'ss'],[/đ|ð/g,'d'],[/ł/g,'l'],[/þ/g,'th']];
function norm(s) {
  let out = String(s ?? '').toLowerCase();
  for (const [re, sub] of SOSTITUZIONI) out = out.replace(re, sub);
  return out.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/['`’]/g, '').trim();
}
const chiave = (s) => norm(s).replace(/[^a-z0-9]/g, '');
/** Cognome: il listino scrive "Paz N.", le fonti scrivono "Nico Paz". */
const cognome = (s) => chiave(String(s).replace(/\s+[A-Z][a-z]?\.$/, ''));

/* ------------------------------ lettura ------------------------------ */

const wb = XLSX.readFile(percorso);
const righe = XLSX.utils
  .sheet_to_json(wb.Sheets['Tutti'], { header: 1, raw: false, defval: '', blankrows: false })
  .slice(2)
  .map((r) => ({
    nome: String(r[3]).trim(),
    squadra: String(r[4]).trim(),
    ruolo: String(r[1]).trim(),
    quotazione: Number(r[5]),
  }))
  .filter((p) => p.nome && p.squadra && 'PDCA'.includes(p.ruolo) && Number.isFinite(p.quotazione));

/* ------------------------------- fasce ------------------------------- */
/* Stesse soglie di src/domain/listone.ts: seed e import devono dare la
   stessa fascia allo stesso giocatore, altrimenti dopo un aggiornamento
   i numeri ballano senza motivo. */
const SOGLIE = { P: [14, 9, 5], D: [16, 10, 5], C: [22, 13, 7], A: [25, 15, 8] };
function fascia(q, ruolo) {
  const [top, semi, terza] = SOGLIE[ruolo];
  if (q >= top) return 'Top';
  if (q >= semi) return 'Semi-top';
  if (q >= terza) return 'Terza fascia';
  return 'Scommessa';
}

/* --------------------------- titolarita' --------------------------- */
/* Il listino NON contiene la probabilita' di essere titolare: nessuna
   colonna, da nessuna parte. La stimo dalla posizione del giocatore nella
   gerarchia della sua squadra per quel ruolo (chi costa piu' di solito
   gioca), che e' una regola grezza ma trasparente. Resta un segnaposto
   da correggere a mano: e' il primo campo da rivedere prima dell'asta. */
const TITOLARI_ATTESI = { P: 1, D: 4, C: 4, A: 2 };
function stimaTitolarita(rango, ruolo) {
  const attesi = TITOLARI_ATTESI[ruolo];
  if (rango < attesi) return 82 - rango * 3;
  if (rango < attesi + 2) return 55 - (rango - attesi) * 7;
  return Math.max(15, 34 - (rango - attesi - 2) * 5);
}

/* --------------------- rigoristi e punizioni --------------------- */

const nonTrovati = [];
const marchi = new Map(); // chiave giocatore -> { rigorista, incerto, punizioni }

for (const [squadra, dati] of Object.entries(SPECIALISTI)) {
  const rosa = righe.filter((p) => p.squadra === squadra);
  if (rosa.length === 0) {
    nonTrovati.push(`SQUADRA "${squadra}" non presente nel listino`);
    continue;
  }

  const trova = (nome) => {
    const k = chiave(nome);
    let p = rosa.find((x) => chiave(x.nome) === k);
    if (p) return p;
    const c = cognome(nome);
    // il cognome delle fonti puo' essere l'ultima parola ("Nico Paz" -> "Paz")
    const parole = norm(nome).split(/\s+/).map(chiave).filter(Boolean);
    const candidati = rosa.filter((x) => {
      const xc = cognome(x.nome);
      return xc === c || parole.includes(xc) || (xc.length > 3 && parole.some((w) => w === xc));
    });
    if (candidati.length === 1) return candidati[0];
    if (candidati.length > 1) {
      nonTrovati.push(`"${nome}" (${squadra}) e ambiguo: ${candidati.map((x) => x.nome).join(' / ')}`);
      return null;
    }
    return null;
  };

  const segna = (nome, patch) => {
    const p = trova(nome);
    if (!p) {
      nonTrovati.push(`"${nome}" (${squadra}) non trovato nel listino`);
      return;
    }
    const k = `${chiave(p.nome)}|${chiave(p.squadra)}`;
    marchi.set(k, { ...(marchi.get(k) ?? {}), ...patch });
  };

  const rigori = dati.rigori ?? [];
  const contesi = dati.rigoriContesi === true;
  // se la gerarchia e' contesa, i primi due sono entrambi candidati incerti
  const quantiPrimi = contesi ? Math.min(2, rigori.length) : 1;
  rigori.slice(0, quantiPrimi).forEach((n) => segna(n, { rigorista: true, incerto: contesi }));
  for (const n of dati.punizioni ?? []) segna(n, { punizioni: true });
}

/* ------------------------------ montaggio ------------------------------ */

const perTeamRuolo = new Map();
for (const p of righe) {
  const k = `${p.squadra}|${p.ruolo}`;
  if (!perTeamRuolo.has(k)) perTeamRuolo.set(k, []);
  perTeamRuolo.get(k).push(p);
}
for (const lista of perTeamRuolo.values()) lista.sort((a, b) => b.quotazione - a.quotazione);

const out = [];
for (const [k, lista] of perTeamRuolo) {
  const ruolo = k.split('|')[1];
  lista.forEach((p, rango) => {
    const m = marchi.get(`${chiave(p.nome)}|${chiave(p.squadra)}`) ?? {};
    out.push({
      nome: p.nome,
      squadra: p.squadra,
      ruolo,
      fascia: fascia(p.quotazione, ruolo),
      rigorista: m.rigorista === true,
      incerto: m.rigorista === true && m.incerto === true,
      punizioni: m.punizioni === true,
      prob: stimaTitolarita(rango, ruolo),
      quotazione: p.quotazione,
    });
  });
}
// ordine finale: ruolo, poi quotazione decrescente
const ORD = { P: 0, D: 1, C: 2, A: 3 };
out.sort((a, b) => ORD[a.ruolo] - ORD[b.ruolo] || b.quotazione - a.quotazione || a.nome.localeCompare(b.nome));

const b = (v) => (v ? 1 : 0);
const corpo = out
  .map((p) => `  [${JSON.stringify(p.nome)}, ${JSON.stringify(p.squadra)}, "${p.ruolo}", ${JSON.stringify(p.fascia)}, ${b(p.rigorista)}, ${b(p.incerto)}, ${b(p.punizioni)}, ${p.prob}, ${p.quotazione}],`)
  .join('\n');

const squadre = [...new Set(out.map((p) => p.squadra))].sort();
const oggi = new Date().toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });

const testata = `/* ============================================================
   Listone di partenza — Serie A 2026/27.

   Generato da "${percorso.split('/').pop()}" (listino ufficiale) il ${oggi}
   con: node scripts/genera-seed.cjs <file.xlsx>
   NON modificare a mano: rilancia lo script.

   COSA VIENE DAL LISTINO UFFICIALE (attendibile):
   nome, squadra, ruolo, quotazione.

   COSA NO (da verificare):
   - la % di titolarita' e' STIMATA dalla gerarchia di quotazione dentro
     la squadra, perche' il listino non contiene quel dato. E' un
     segnaposto: e' il primo campo da correggere a mano prima dell'asta.
   - la fascia e' dedotta dalla quotazione con le soglie di
     src/domain/listone.ts, non e' una classificazione ufficiale.
   - rigoristi e tiratori di punizioni vengono da tre siti di fantacalcio
     (vedi scripts/rigoristi-2026-27.cjs), letti il ${oggi}. Il mercato
     chiude il 1 settembre e le gerarchie cambiano: dove le fonti non
     concordano il giocatore e' marcato "incerto".

   ${out.length} calciatori, ${squadre.length} squadre.
   ============================================================ */

import type { Calciatore, Fascia, Ruolo } from '../types';

/** [nome, squadra, ruolo, fascia, rigorista, rigoristaIncerto, tiratorePunizioni, probTitolare, quotazioneBase] */
type RigaSeed = [string, string, Ruolo, Fascia, 0 | 1, 0 | 1, 0 | 1, number, number];

const RIGHE: RigaSeed[] = [
`;

const coda = `];

export const NUMERO_CALCIATORI_SEED = RIGHE.length;

export function creaListoneSeed(): Calciatore[] {
  return RIGHE.map(
    (
      [nome, squadra, ruolo, fascia, rigorista, rigoristaIncerto, tiratorePunizioni, probTitolare, quotazioneBase],
      i,
    ) => ({
      id: \`seed-\${i + 1}\`,
      nome,
      squadra,
      ruolo,
      fascia,
      rigorista: rigorista === 1,
      rigoristaIncerto: rigoristaIncerto === 1,
      tiratorePunizioni: tiratorePunizioni === 1,
      probTitolare,
      quotazioneBase,
      stato: 'disponibile' as const,
      prezzoPagato: null,
      prezzoDiMercato: null,
      acquirenteId: null,
      note: '',
      ordineObiettivo: 0,
      daRivedere: null,
      modificatiAMano: [],
    }),
  );
}

/** Squadre di Serie A presenti nel listone, per il filtro. */
export const SQUADRE_SEED: string[] = ${JSON.stringify(squadre)};
`;

writeFileSync('src/data/listone-seed.ts', testata + corpo + '\n' + coda);

console.log(`Scritti ${out.length} calciatori, ${squadre.length} squadre.`);
console.log(`Rigoristi marcati: ${out.filter((p) => p.rigorista).length} (di cui ${out.filter((p) => p.incerto).length} con gerarchia contesa)`);
console.log(`Tiratori di punizioni: ${out.filter((p) => p.punizioni).length}`);
if (nonTrovati.length) {
  console.log(`\nDA SISTEMARE A MANO (${nonTrovati.length}):`);
  nonTrovati.forEach((r) => console.log('  - ' + r));
} else {
  console.log('\nTutti i nomi delle fonti sono stati abbinati al listino.');
}
