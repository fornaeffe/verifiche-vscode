# Attività aperte

## Previsioni del piano iniziale ancora parziali

Revisione del 15 ottobre 2026: confronto tra
[PIANO-VSCODE.md](docs/archivio-implementazione/PIANO-VSCODE.md) e sorgenti.
Le checkbox delle fasi non esaurivano tutti i dettagli dei contratti. Queste attività
registrano le differenze; non sono state implementate in questa revisione.

- [ ] **Scansioni cancellabili e risultati obsoleti** (piano §3): completare progresso
  e cancellazione per le scansioni lunghe, in particolare rinomina variante e
  migrazione, e scartare i risultati delle richieste superate. Il controllo globale
  e la ricerca utilizzi hanno già controlli di cancellazione; `enumerate` non riceve
  un token, `renameVariant` e il motore di migrazione non espongono cancellazione,
  il completamento non verifica token/versione dopo le letture asincrone.
- [ ] **Snapshot condiviso tra anteprima ed export** (piano §4.5, F5): completare
  la coerenza dei sorgenti e delle risorse tra quanto mostrato e quanto stampato,
  comprese immagini e stili che cambiano durante l’operazione. L’anteprima conserva
  uno snapshot, ma `pdf` in `src/commands.ts` ne acquisisce uno nuovo e `src/pdf.ts`
  carica successivamente le risorse dal disco. Preservare il supporto ai buffer non salvati.
- [ ] **Cursore sui campi da compilare** (piano §§4.1–4.3, F4): dopo inserimento
  di blocco, creazione esercizio o aggiunta variante portare il cursore al campo
  utile; dopo aggiunta traccia rendere subito modificabile il nuovo ID. Ora i comandi
  aprono il documento, selezionano l’inizio del blocco o lasciano il cursore dov’era.
- [ ] **Cartella contestuale per un nuovo esercizio** (piano §4.2, F4): usare la
  cartella contestuale selezionata se pertinente, altrimenti la radice esercizi.
  `addBlock` propone sempre `esercizi/nuovo-esercizio.md` alla finestra di salvataggio.
- [ ] **Chiudere il selettore passando a un documento estraneo** (piano §4.5, F5):
  annullare la scelta senza applicarla anche quando si attiva un file fuori dai
  contenuti, mantenendo identificabile l’ultima anteprima. `active` in
  `src/extension.ts` chiama `Preview.show` solo per documenti pertinenti e negli
  altri casi lascia aperta la modalità di scelta.

## Collaudi e distribuzione ancora da documentare

Le prove generali di drop esercizi, drop/incolla immagini e annullamento/ripristino,
e il confronto qualitativo di fluidità sono stati confermati dall’utilizzatore.
I casi sotto non hanno ancora un esito specifico registrato; non indicano difetti accertati.
Usare fixture sintetiche e profili isolati per le prove tecniche.

- [ ] **Dialoghi nativi di creazione cartella dati**: registrare la selezione reale
  della cartella genitore/vuota e l'apertura nella nuova finestra, anche su macOS/Linux.
  Creazione, annullamenti dei dialoghi ed errori sono coperti nel vero Extension Host
  con dialoghi iniettati; apertura/annullamento del primo menu provati con CDP.
- [ ] **Finestra nativa di creazione esercizio** (F1/F4): registrare la prova di
  selezione cartella/nome (anche con nome proposto configurato), annullamento senza file o riferimento residuo e recupero
  da errore parziale. La funzionalità è implementata; l’ultimo checkpoint la lasciava
  al collaudo specifico dell’utilizzatore.
- [ ] **Rinomina/spostamento di una cartella da Explorer** (F3): verificare gli
  aggiornamenti degli utilizzi, i documenti non salvati, collisioni e undo multi-file;
  includere lo spostamento fuori dalla radice esercizi e il relativo avviso.
  La prova registrata nell’Extension Host copre la rinomina di un file, non la cartella.
- [ ] **Primo setup Chromium da installazione vuota** (F5): provare il comando
  dell’estensione con cache separata inizialmente vuota, l’export successivo e il
  funzionamento offline dopo il setup. I PDF precedenti usavano Chromium già presente.
- [ ] **Scorciatoia chimica e pacchetto aggiornato**: registrare la prova sulla
  tastiera fisica dell’utilizzatore e su macOS/Linux; installare il VSIX aggiornato
  e verificarlo nel profilo ordinario. Creato il pacchetto 0.1.4 durante la consegna
  del setup dati; i test Windows con CDP sono riusciti, senza installazione nel profilo ordinario.

## Completato

- [x] **Manuale d’uso e guida offline**: README sintetico, tutorial, guide per
  compito, riferimento Markdown/YAML e comandi/settings, problemi, uso degli
  agenti sui contenuti ed esempi dei cinque tipi. Comando **Verifiche: Apri guida**
  senza documento dati attivo e richiamo nel README generato dal setup.
  Supporto su GitHub Discussions/Issues. Superati controllo documentale,
  31 test, build ed Extension Host VS Code 1.100.0 su Windows, anche sul VSIX
  estratto; controllati collegamenti locali/case e separazione dai documenti
  di sviluppo. Esempi validati ed esportati in due PDF da 10 punti.
  Creato un VSIX di prova, senza nuova release, installazione nel profilo ordinario,
  commit o push. Nessun nuovo collaudo macOS/Linux.
- [x] **Documentare la produzione del file installabile**:
  [procedura VSIX](docs/distribuzione.md) con prerequisiti, verifiche, contenuti
  inclusi/esclusi e prova isolata. [CONTRIBUTING](CONTRIBUTING.md), architettura,
  CLI, distribuzione, istruzioni di sviluppo e archivio restano solo nel repository.
- [x] **Creazione cartella dati e CSS pulito**: comando nuovo/vuoto, Git locale
  facoltativo senza commit/remoti, `.gitkeep`, README e `.gitignore`, nessuna
  sovrascrittura, annullamenti prima delle scritture e dettagli degli errori parziali.
  Configurazione dei contenuti annidati validata e conservata nella nuova cartella.
  Unico CSS incluso/copiato, senza regole e classi legacy; risposte VF/Etichettare
  corrette anche nelle schede esercizio/selettore. PDF e anteprima usano il CSS della
  radice workspace. Superati 29 test di dominio, build, Extension Host VS Code 1.100.0
  e controlli Chromium sui cinque tipi; PDF A4 sintetici ispezionati e confrontati.
  Creato il VSIX 0.1.4 e ripetuta l'intera suite sul pacchetto estratto, senza dipendenze
  dal checkout del sorgente. Collaudo dei dialoghi nativi distinto sopra.
- [x] **Aggiornamenti sulle sole dipendenze attive** (piano §3, F2/F5): anteprima,
  selettore varianti e diagnostica dei documenti visibili seguono i propri riferimenti,
  compresi file mancanti, allegati e stile personalizzato. Gli eventi estranei non
  rilanciano anteprima o diagnosi; gli insiemi cambiano con i riferimenti correnti,
  senza grafo globale. Superati 24 test di dominio, build ed Extension Host su
  VS Code 1.100.0: buffer non salvati, due radici, modifiche estranee, creazione e
  cancellazione delle dipendenze, immagini/stili, selettore e pannello chiuso.
  Nessun nuovo VSIX creato o installato.
- [x] **Popolamento automatico delle nuove tracce**: prima variante non vuota libera nell’ordine del file, contando tutte le tracce e gli usi effettivi di `default`. Gli usi ripetuti dello stesso esercizio riservano varianti distinte nell’ordine dei blocchi, anche annidati; esaurite le varianti, assegnazione esplicita `''`. Verificati test di dominio, build ed Extension Host con buffer non salvati, esaurimento, annulla/ripristina e assenza di modifiche parziali su esercizi mancanti o malformati. Nessun nuovo VSIX creato o installato.
- [x] Gli esercizi aggiunti tramite comando o drop ricevono `punti: 1`, salvo nei gruppi con punteggio (anche `0`, inclusi gli antenati). Opzione `verifiche.defaultExercisePoints` nei settings, attiva per default. Verificati test di dominio, build ed Extension Host con cambio impostazione e annulla/ripristina.
- [x] Inserimento formula chimica con `Ctrl+K`, poi `Ctrl+Alt+H` (`Cmd+K`, poi `Cmd+Alt+H` su macOS): aggiunge `$\ce{}$` con il cursore tra le parentesi graffe. Verificati assenza di conflitti predefiniti e pressione effettiva della sequenza su Windows.
- [x] Esporre in settings i nomi di default e il percorso di output: cinque opzioni
  documentate nel [riferimento delle impostazioni](docs/riferimento/comandi-impostazioni.md#impostazioni).
  Verificati 21 test di dominio, build ed Extension Host su VS Code 1.100.0 con
  due cartelle workspace, modifiche senza riavvio ed export PDF reali.
