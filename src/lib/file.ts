/* Lettura e scrittura di file locali. Nessuna rete: non esiste un'API
   pubblica a cui collegarsi, il file lo scarico io dal sito e lo do all'app. */

import Papa from 'papaparse';
import type { RigaGrezza } from '../types';

export interface FoglioLetto {
  righe: RigaGrezza[];
  nomeFile: string;
}

export async function leggiFile(file: File): Promise<FoglioLetto> {
  const nome = file.name.toLowerCase();
  if (nome.endsWith('.xlsx') || nome.endsWith('.xls')) return leggiXlsx(file);
  return leggiCsv(file);
}

function leggiCsv(file: File): Promise<FoglioLetto> {
  return new Promise((risolvi, rifiuta) => {
    Papa.parse<string[]>(file, {
      // il tracciato italiano usa spesso il punto e virgola: lo rileva Papa
      delimiter: '',
      skipEmptyLines: 'greedy',
      complete: (res) => {
        risolvi({
          nomeFile: file.name,
          righe: res.data.map((celle, i) => ({
            numeroRiga: i + 1,
            celle: celle.map((c) => String(c ?? '')),
          })),
        });
      },
      error: (err: Error) => rifiuta(new Error(`CSV illeggibile: ${err.message}`)),
    });
  });
}

async function leggiXlsx(file: File): Promise<FoglioLetto> {
  // xlsx pesa: si carica solo quando serve davvero
  const XLSX = await import('xlsx');
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array' });
  const nomeFoglio = wb.SheetNames[0];
  if (!nomeFoglio) throw new Error('Il file non contiene fogli.');
  const foglio = wb.Sheets[nomeFoglio];
  const matrice = XLSX.utils.sheet_to_json<string[]>(foglio, {
    header: 1,
    raw: false,
    defval: '',
    blankrows: false,
  });
  return {
    nomeFile: file.name,
    righe: matrice.map((celle, i) => ({
      numeroRiga: i + 1,
      celle: (celle ?? []).map((c) => String(c ?? '')),
    })),
  };
}

export function scarica(contenuto: string, nomeFile: string, tipo = 'text/plain;charset=utf-8') {
  const blob = new Blob([contenuto], { type: tipo });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nomeFile;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function leggiTesto(file: File): Promise<string> {
  return file.text();
}

export function dataPerNomeFile(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}
