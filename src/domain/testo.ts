/* ============================================================
   Normalizzazione e ricerca. Cercare "hojlund" deve trovare
   "Højlund": accenti via, maiuscole via, e la "ø" mappata a mano
   perche' NFD non la scompone (e' una lettera, non una vocale
   accentata).
   ============================================================ */

const SOSTITUZIONI: Array<[RegExp, string]> = [
  [/ø/g, 'o'],
  [/æ/g, 'ae'],
  [/œ/g, 'oe'],
  [/ß/g, 'ss'],
  [/đ|ð/g, 'd'],
  [/ł/g, 'l'],
  [/þ/g, 'th'],
];

export function normalizza(s: string): string {
  let out = (s ?? '').toString().toLowerCase();
  for (const [re, sub] of SOSTITUZIONI) out = out.replace(re, sub);
  return out
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['`’]/g, '')
    .trim();
}

/** Chiave di identita' di un calciatore per il merge dell'import. */
export function chiaveCalciatore(nome: string, squadra: string): string {
  return `${normalizza(nome).replace(/[^a-z0-9]/g, '')}|${normalizza(squadra).replace(/[^a-z0-9]/g, '')}`;
}

/** Chiave sul solo nome: serve a riconoscere chi ha cambiato squadra. */
export function chiaveNome(nome: string): string {
  return normalizza(nome).replace(/[^a-z0-9]/g, '');
}

/**
 * Match tollerante usato dalla ricerca del listone e dell'asta rapida.
 * Accetta il match su nome completo, su una qualsiasi parola del nome
 * (cosi' "vlahovic" trova "Vlahovic D.") e sulla squadra.
 */
export function corrisponde(query: string, nome: string, squadra: string): boolean {
  const q = normalizza(query);
  if (!q) return true;
  const n = normalizza(nome);
  const s = normalizza(squadra);
  if (n.includes(q) || s.includes(q)) return true;
  return n.split(/[\s.'-]+/).some((parola) => parola.startsWith(q));
}

/**
 * Punteggio di rilevanza: piu' basso = piu' in alto nei risultati.
 * Serve all'asta rapida, dove digito 3 lettere e voglio il giocatore giusto
 * al primo posto senza dover premere freccia giu'.
 */
export function rilevanza(query: string, nome: string, squadra: string): number {
  const q = normalizza(query);
  if (!q) return 50;
  const n = normalizza(nome);
  if (n === q) return 0;
  if (n.startsWith(q)) return 1;
  const parole = n.split(/[\s.'-]+/);
  if (parole.some((p) => p.startsWith(q))) return 2;
  if (n.includes(q)) return 3;
  if (normalizza(squadra).startsWith(q)) return 4;
  return 5;
}
