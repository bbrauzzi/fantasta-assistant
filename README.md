# FantAsta Assistant

Copilota per l'**asta live del Fantacalcio** (Serie A, Classic). Non è un gestionale di lega e non
gioca l'asta al posto tuo: sta aperto sul portatile mentre l'asta si svolge e in ogni istante ti dice
**quanto puoi spendere, su chi, e cosa succede se rilanci**.

Gira interamente nel browser. Nessun backend, nessun account, nessuna chiamata di rete: dopo il primo
caricamento funziona offline.

## Avvio

```bash
npm install
npm run dev          # apri http://localhost:5173
```

| Comando | Cosa fa |
|---|---|
| `npm run dev` | server di sviluppo |
| `npm run build` | build di produzione in `dist/` |
| `npm run preview` | serve la build (necessario per provare la PWA) |
| `npm test` | test della logica di dominio |
| `npm run test:watch` | test in watch |

Aprila a tutto schermo in Chrome o Firefox. È progettata per **1440×900** e resta usabile a
**1280×720**; sotto 1024 px mostra solo «Apri su schermo più grande», perché impilare tutto in una
colonna renderebbe inutilizzabile uno strumento a densità alta.

**Installarla come app**: dopo `npm run build && npm run preview`, dal menu del browser scegli
«Installa app». Da quel momento hai una finestra a sé e funziona senza rete.

## Il dato importante da sapere subito

> Il listone di partenza in `src/data/listone-seed.ts` contiene **dati indicativi, non verificati**.
> Nomi, squadre, quotazioni, rigoristi e probabilità di titolarità sono plausibili ma inventati a
> mano per avere qualcosa su cui lavorare. **Va sostituito con il listone ufficiale** prima dell'asta,
> con «Aggiorna listone». Fino a quel momento ogni prezzo consigliato che leggi è costruito su numeri
> indicativi.

## Importare e aggiornare il listone

Il pulsante **«Aggiorna listone»** è in alto nella barra dei filtri, non nascosto nelle impostazioni.
Il flusso è in tre passi e **non scrive niente** prima della tua conferma:

1. **Scarichi tu il file** delle quotazioni (CSV o XLSX) da
   [Fantacalcio.it → Quotazioni](https://www.fantacalcio.it/quotazioni-fantacalcio).
   L'app non può scaricarlo da sola: non esiste un'API pubblica e uno scraping dal browser verrebbe
   bloccato dalle policy CORS. Il pulsante lo dice esplicitamente invece di fingere una
   sincronizzazione che non può esistere.
2. **Mappi le colonne**. Il tracciato del file cambia ogni anno, quindi l'app propone gli
   abbinamenti più probabili leggendo le intestazioni, ma decidi tu. Nome, squadra, ruolo e
   quotazione sono obbligatori; fascia, rigorista e titolarità sono facoltativi (la fascia mancante
   viene dedotta dalla quotazione ed è modificabile a mano).
3. **Leggi il referto** e applichi. Il referto è diviso in *trasferimenti*, *nuovi arrivi*,
   *usciti*, *quotazioni cambiate* (ordinate per variazione assoluta decrescente) e *cambi di ruolo*.
   Puoi deselezionare singole modifiche.

Cosa garantisce l'aggiornamento:

- **Riconosce i trasferimenti**: se un nome già presente compare con una squadra diversa, è un
  trasferimento, non un doppione. È l'informazione per cui stai aggiornando a pochi giorni dall'asta.
- **Il tuo lavoro non si tocca**: stato (obiettivo/acquistato/scartato), note, prezzo pagato,
  posizione nella lista obiettivi e i campi che hai corretto a mano restano come sono. L'aggiornamento
  riguarda i dati anagrafici e di listino, mai le tue decisioni.
- **Non ricalcola la titolarità.** Un cambio di squadra rende probabilmente sbagliata la percentuale
  che avevi inserito, ma l'app non ha modo di sapere quella giusta: marca il campo come *da rivedere*
  e lascia il numero a te. Non inventa una stima.
- **«Obiettivi da rivedere»**: un banner in cima al listone elenca i tuoi obiettivi e acquisti che
  hanno cambiato squadra o ruolo, e resta lì finché non li marchi come visti. Se un tuo obiettivo è
  fra gli *usciti*, l'avviso è in rosso.
- **Snapshot automatico** etichettato prima di applicare, per tornare indietro se l'import combina guai.
- **Righe malformate**: se il file non torna, l'app spiega riga per riga cosa non va e non scrive nulla.
- **File parziali**: se il file copre meno del 70% del tuo listone, gli «usciti» partono
  deselezionati — è più probabile che sia un estratto che mezzo campionato svincolato.

Serve solo correggere un trasferimento? Il pennino su ogni riga del listone (o il tasto `E`) apre la
modifica inline: squadra, ruolo, fascia, titolarità, quotazione, note. Ogni campo toccato lì viene
marcato come tuo e i prossimi aggiornamenti non lo sovrascrivono.

## Le formule di budget

Sono tutte in `src/domain/budget.ts`, funzioni pure e commentate.

### Prezzo consigliato

```
prezzoConsigliato = max(1, round(quotazioneBase × (budgetTotale / 500) × (numPartecipanti / 8)))
```

Il listino ufficiale è tarato su 500 crediti e 8 partecipanti. Se la tua lega ha parametri diversi la
quotazione va riscalata: più budget significa prezzi più alti, più partecipanti significa più domanda
sullo stesso numero di calciatori, quindi ancora prezzi più alti.

È un **riferimento, non un prezzo di mercato**: in un'asta fra amici il prezzo reale dipende dalla
concorrenza sul momento. Per questo accanto all'offerta che stai digitando compare lo **scostamento**
(«+38% sul consigliato»): è un dato neutro, non un giudizio.

### Max offerta — i crediti che puoi davvero offrire ora

È la funzione più importante dell'app. Il budget residuo grezzo inganna: se ti restano 200 crediti ma
devi ancora riempire 7 slot, non puoi offrirne 200, perché 6 di quei crediti sono già impegnati a
riempire gli altri 6 slot al prezzo minimo.

```
slotAncoraDaRiempire = Σ max(0, slotPerRuolo − acquistatiPerRuolo)
maxOfferta           = creditiResidui − (slotAncoraDaRiempire − 1) × prezzoMinimoSlot
```

Il **−1** è lo slot che stai per riempire con questa offerta: è uno di quelli contati in
`slotAncoraDaRiempire`, quindi non va vincolato al minimo. Passando il mouse sul numero, l'app spiega
la differenza fra i due valori.

Esiste anche una **max offerta per ruolo**, che è il minore fra il vincolo globale e quello che resta
della quota di budget assegnata a quel ruolo:

```
budgetDelRuolo  = round(budgetTotale × percBudgetPerRuolo[r] / 100)
vincoloDiRuolo  = residuoDelRuolo − (slotLiberiDelRuolo − 1) × prezzoMinimoSlot
maxOffertaRuolo = min(maxOfferta, vincoloDiRuolo)
```

La quota di ruolo è un piano, non un muro: può andare in negativo se l'hai sforata, e si vede.

### Simulatore di offerta

Digitando un prezzo su una riga si apre **sotto la riga** (non sopra le successive) una fascia che
ricalcola a ogni carattere: residui dopo, max offerta dopo, budget di ruolo dopo, slot rimasti e
credito medio per slot, scostamento sul consigliato, e quanti avversari possono ancora rilanciare.

Gli avvisi hanno due gravità e **nessuno dei due blocca la conferma**:

| Colore | Quando | Cosa fa |
|---|---|---|
| ambra | superi la quota di budget del ruolo, ma il totale regge | avvisa |
| rosso | dopo l'acquisto non riusciresti a riempire gli slot rimanenti al minimo | avvisa |
| rosso | sfori il budget totale | avvisa **e chiede una seconda conferma** |

La seconda conferma esiste solo per l'ultimo caso, perché lì è quasi sempre un errore di battitura.
Per tutto il resto: l'app informa e decidi tu. Ogni operazione è annullabile con `Ctrl+Z`.

### Stime sugli avversari

I residui e la max offerta degli avversari usano la stessa formula, applicata a **quello che hai
inserito tu**. Ci sono due modi di tracciare:

- **per giocatore** (preciso): quando marchi un calciatore come preso da un avversario, indichi a chi
  e a quanto;
- **conteggio rapido** (approssimato): i pulsanti `+1 +5 +10 +25` sulla riga della squadra, per quando
  non hai tempo di dettagliare.

Le squadre con acquisti registrati solo col conteggio rapido sono marcate `~ dati parziali` e i loro
numeri passano in ambra: i residui risultano **per eccesso**. L'app lo dice invece di mostrarti un
numero che sembra affidabile.

## Scorciatoie da tastiera

Non si attivano mentre scrivi in un campo di testo (tranne `Esc`, e `Ctrl+Z`/`Ctrl+Shift+Z` che
valgono sempre — in asta si sbaglia a digitare di continuo). `?` apre la mappa completa.

| Tasto | Azione |
|---|---|
| `/` | vai al campo di ricerca |
| `↑` `↓` | naviga i risultati |
| `Invio` | apri il simulatore di offerta sul selezionato |
| `A` | segna come acquistato da te (porta il cursore sul campo prezzo) |
| `V` | segna come preso da un avversario |
| `S` | scarta |
| `O` | aggiungi o togli dagli obiettivi |
| `E` | modifica il calciatore selezionato |
| `F` | modalità asta rapida |
| `M` | vista formazioni per modulo |
| `Ctrl+Z` / `Ctrl+Shift+Z` | annulla / ripristina (almeno 50 azioni) |
| `Esc` | chiudi la finestra o annulla l'input corrente |
| `?` | mappa delle scorciatoie |

La **modalità asta rapida** (`F`) è interamente utilizzabile da tastiera: campo di ricerca a fuoco
automatico, `↑↓` per scorrere, `Tab` per passare al campo offerta, `Invio` per confermare, `V` e `S`
dal campo offerta per avversario e scarto. Premendo `V` si apre un selettore di squadra numerato
(`1`-`9`, una cifra per avversario): un numero registra a chi è andato il calciatore, `Invio` vale
«non lo so» (il calciatore esce comunque dal mercato), `Esc` annulla e torna alle quattro azioni.
Se devi spostare la mano sul trackpad, ha fallito.

## Le viste

- **Listone** — tabella densa con filtri (ruolo, fascia, squadra, ricerca, solo disponibili, solo
  rigoristi), ordinamento per colonna, simulatore inline, modifica inline. La ricerca è
  accent-insensitive e tollera il match parziale sul cognome: `hojlund` trova `Højlund`, `paz` trova
  `Nico Paz`. A destra: quanti ne restano per ruolo e fascia, chi può rilanciare, constatazioni sulla rosa.
- **Obiettivi** — raggruppati per ruolo, riordinabili per trascinamento (l'ordine è la tua scala di
  priorità). «Riempi gli slot scoperti» aggiunge i migliori disponibili **senza cancellare** quelli
  che hai messo tu. Puoi mettere più obiettivi degli slot: l'intestazione lo segnala come
  «alternative» senza impedirlo. Quando un obiettivo esce dal mercato e lo slot resta scoperto, il
  miglior candidato viene **promosso automaticamente**: lampeggia in oro per due secondi, finisce nel
  registro, ed è annullabile.
- **Rosa** — acquisti per ruolo con prezzi, totali, titolarità media, constatazioni di composizione
  (concentrazione per squadra reale, rigoristi, spesa fuori piano, slot scoperti), export di fine asta.
- **Avversari** — spesa, slot, residui e max offerta stimata per squadra; nomi modificabili;
  conteggio rapido; espansione con i calciatori tracciati; «chi può rilanciare» a soglia
  modificabile; ruoli già saturi.
- **Moduli** — copertura di ogni modulo, formazione proposta, vista campo, panchina con ordine di
  subentro. La copertura misura **quanta titolarità riesci a mettere negli 11 slot**, non quanti
  giocatori hai: distingue una rosa completa ma fragile da una incompleta ma solida. Funziona anche a
  rosa incompleta, ed è lì che serve di più: la constatazione in oro dice quale ruolo darebbe il
  maggior guadagno di copertura con un acquisto in più.
- **Registro** — cronologia filtrabile di tutto (le promozioni automatiche in oro) e snapshot
  ripristinabili.
- **Setup** — parametri di lega, slot e ripartizione del budget per ruolo, export/import dello stato
  in JSON, azzeramento dell'asta.

## Persistenza

Il salvataggio su `localStorage` è **automatico a ogni modifica**: non esiste un pulsante «salva». Se
ricarichi la pagina o il browser crasha a metà asta, riapri e trovi tutto. In alto a destra c'è
l'orario dell'ultimo salvataggio.

- **Undo/redo** su 60 azioni: ogni modifica di stato passa da un unico punto, quindi non esiste
  un'azione non annullabile.
- **Snapshot** — gli ultimi 20 stati, creati automaticamente prima di ogni aggiornamento del listone e
  prima di ogni reset, oppure a mano dal Registro. Vivono nella sessione.
- **Export/import JSON** dal Setup, per il backup che sopravvive al browser e per passare a un altro PC.
- **Azzera l'asta** — riporta stati e prezzi a zero **conservando listone e note**, per l'asta di
  riparazione o una prova a vuoto. Chiede conferma.

## Export di fine asta

Dalla vista Rosa: **CSV** con tracciato `Ruolo;Nome;Squadra;Prezzo`, **JSON** completo, e un
**riepilogo testuale** copiabile.

> **Non esiste un'API pubblica di Fantacalcio.it o Leghe Fantacalcio** a cui questa app possa
> collegarsi per caricare la rosa automaticamente. Il caricamento in lega resta manuale, tramite
> l'import CSV del pannello admin (*Gestione rose → Importa*). Sta scritto anche accanto al pulsante
> di export, per non restarci male a fine asta aspettando una sincronizzazione che non può esistere.

## Struttura del codice

```
src/
  types.ts                tipi del dominio
  domain/                 TUTTA la logica, in funzioni pure senza React
    budget.ts             prezzo consigliato, max offerta, simulazione
    obiettivi.ts          generazione, riordino, auto-rimpiazzo
    avversari.ts          stime, chi può rilanciare, ruoli saturi
    scarsita.ts           quanti ne restano, domanda residua della lega
    rosa.ts               constatazioni di composizione
    moduli.ts             formazioni, copertura, guadagno per ruolo
    moduli-config.ts      elenco dei moduli — estendibile senza toccare la UI
    listone.ts            import, referto delle differenze, applicazione
    filtri.ts             filtro, ordinamento, ricerca
    esporta.ts            CSV, JSON, riepilogo
    testo.ts              normalizzazione e ricerca accent-insensitive
    *.test.ts             138 test su tutta la logica, casi limite inclusi
  store/                  Zustand persistito + selettori derivati
  components/             una vista o un pezzo di vista per file
  ui/                     primitive visive (pannelli, badge, pulsanti, numeri)
  data/listone-seed.ts    listone di partenza — DATI INDICATIVI
```

La separazione fra dominio e UI è netta: i componenti consumano le funzioni pure e non duplicano
nessun calcolo. Aggiungere un modulo di gioco significa aggiungere una riga a `moduli-config.ts`.

I test coprono i casi limite che contano: budget esaurito, zero slot rimanenti, avversari senza
crediti, import con righe malformate e duplicate, auto-rimpiazzo quando non restano candidati,
`numPartecipanti` e `budgetTotale` a valori estremi, file di import parziali.

## Direzione visiva

Verde da campo (`#0B3D2E`), testo color gesso, **oro solo per obiettivo, max offerta e selezione**.
I quattro colori di stato portano significato e non hanno usi ornamentali: verde = acquisito, rosso =
perso o fuori portata, ambra = attenzione, oro = obiettivo. Numeri sempre tabulari, così le cifre non
ballano mentre cambiano. Nessuna ombra, nessuna animazione tranne il lampeggio di due secondi sulla
riga promossa automaticamente a obiettivo — disattivato sotto `prefers-reduced-motion`. Focus visibile
su ogni elemento interattivo, perché l'app si usa da tastiera.

## Dipendenze

React, Zustand (`persist`), Tailwind, `lucide-react` per le icone, `papaparse` per il CSV, `xlsx`
per gli XLSX (caricato solo quando serve), `vite-plugin-pwa`. Vitest per i test. Nessuna libreria di
componenti UI: sono scritti a mano.
