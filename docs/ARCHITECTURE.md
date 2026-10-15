# Architettura e sviluppo

Documento del repository, escluso dal VSIX. Per scegliere la sola documentazione
pertinente al compito vedi [CONTRIBUTING.md](../CONTRIBUTING.md); per usare
l’estensione vedi il [manuale](README.md).

`src/core.ts` analizza e rende Markdown/YAML. `src/document.ts` individua nodi e
intervalli del sorgente e produce modifiche circoscritte. `src/repository.ts` risolve
i percorsi e carica soltanto le dipendenze richieste; la cache degli esercizi è
limitata a 64 documenti ed è eliminabile.

`src/host.ts` adatta URI e buffer VS Code al motore. Le operazioni di anteprima/export
acquisiscono i testi dei buffer aperti all'inizio dello snapshot. `commands.ts` e
`providers.ts` applicano WorkspaceEdit, CodeLens, azioni, completamento, definizioni,
ricerca utilizzi, rinomina e trasferimenti di immagini/esercizi.

`verifiche.openGuide` apre `docs/README.md` dall’URI dell’installazione con
`markdown.showPreview`, senza dipendere da un documento dati attivo. Il VSIX
include soltanto la documentazione d’uso selezionata in `.vscodeignore`;
architettura, CLI, distribuzione, istruzioni agenti di sviluppo e archivio
storico rimangono nel repository. La documentazione degli agenti installata
riguarda esclusivamente il lavoro sui contenuti.

`settings.ts` contiene default e validazione dei nomi di creazione e della
destinazione PDF, senza dipendere da VS Code. `host.settings(uri)` legge la
configurazione della risorsa a ogni operazione; ciascun comando valida solo i
valori che usa, prima delle modifiche o dell’export. I template ricevono i nomi
come parametri. L’estensione risolve l’output rispetto alla radice workspace del
documento e lo passa a `exportPDF`; la CLI conserva il default del motore.

`setup.ts` crea una cartella dati nuova o vuota con directory, `.gitkeep`, CSS,
README e `.gitignore`. Valida il percorso relativo dei contenuti prima di scrivere;
usa creazioni esclusive e segnala gli elementi già creati in caso di errore parziale,
senza eliminazioni automatiche. Per contenuti non standard salva il setting nella
nuova cartella. `setup-command.ts` raccoglie tutte le scelte prima delle scritture,
offre `git init` facoltativo (processo senza shell, nessun commit/remoto) e apre una
nuova finestra. I dialoghi sono iniettabili per provare annullamenti ed errori.
Il CSS copiato proviene dall'installazione, mai da checkout esterni.

`preview.ts` tiene una sola webview: segue l'editor e passa temporaneamente al
selettore varianti. I contenuti sono in iframe senza script. CSS, font e immagini
necessari sono incorporati negli iframe, perché le risorse dei documenti srcdoc
non sono gestite come quelle del documento principale dal service worker VS Code.
Il pannello dei comandi usa messaggi validati rispetto al documento e alla sua
versione. I contenuti non ricevono il nonce degli script del pannello.
Anche le schede esercizio e del selettore includono la classe del tipo, necessaria
per risposte VF/Etichettare e interlinea Completamento.

`dependencies.ts` conserva i percorsi usati dall’anteprima corrente (anche nel
selettore) e, separatamente, dalla diagnostica dei documenti visibili o in anteprima.
`extension.ts` filtra e raggruppa gli eventi dei buffer e del filesystem su questi
insiemi, senza scansioni globali; un’anteprima già ricalcolata dopo un evento non
viene aggiornata di nuovo per quell’evento. I riferimenti mancanti sono registrati
prima delle letture per rilevarne la creazione. Allegati e stile personalizzato
seguono la propria radice workspace; la chiusura del pannello libera i suoi riferimenti.

`pdf.ts` stampa tramite Chromium un insieme già acquisito di sorgenti e risorse.
Il server HTTP è temporaneo, su loopback e porta casuale; serve soltanto le risorse
precaricate. Non occorre avviare un'applicazione web separata.
`random-order.ts` prepara una copia dell’albero per traccia: Fisher–Yates sui
figli diretti dei gruppi abilitati, flusso SHA-256 v1 separato per seme, ID traccia
e percorso originale del gruppo, con rejection sampling. Non muta lo snapshot
né il sorgente. Il seme di 16 cifre esadecimali entra nel nome dei PDF casuali;
il flusso v1 deve restare stabile per riprodurre i semi precedenti.
`pdf-order-ui.ts` raccoglie ordine originale, seme nuovo o riutilizzato prima
della stampa; i dialoghi sono iniettabili nei test Extension Host.
Il comando passa esplicitamente il CSS della radice workspace, come l'anteprima;
la CLI conserva la ricerca nel genitore dei contenuti. Il CSS incluso in `media`
è anche il modello copiato durante il setup e il ripiego quando manca quello dei dati.

`migration.ts` produce un piano e confronta tutte le tracce prima di applicare
modifiche. Un errore o una revisione cambiata impedisce l'applicazione; l'applicazione
è ripetibile. `cli.ts` espone migrazione, validazione e PDF anche senza VS Code.

Le previsioni del piano iniziale ancora parziali e le prove specifiche mancanti
sono elencate in [TODO.md](../TODO.md). Il contesto delle scelte è
nell’[archivio di implementazione](archivio-implementazione/README.md).

## Comandi di sviluppo

```sh
npm ci
npm run docs:check
npm test
npm run build
npm run test:integration
npm run package
```

I test d'integrazione aprono due copie temporanee delle fixture in un workspace
multi-root e in un Extension Development Host isolato, con impostazioni distinte
per cartella e contenuti annidati nella seconda. Provano anche cambi dei settings
senza riavvio e PDF reali nelle destinazioni relative e assolute configurate.
Scaricano VS Code 1.100.0, oppure usano il percorso
`VSCODE_EXECUTABLE` se impostato. Verificano anche il selettore nella webview reale
attraverso una porta CDP locale effimera, usata soltanto dai test. Screenshot e log
sono esclusi da Git. F5 usa invece la configurazione in `.vscode/launch.json`.
La suite prova anche export casuali con gruppi annidati e buffer non salvati,
annullamenti, validazione/riuso dei semi e nomi con sovrascrittura; con CDP apre
il menu reale, lo annulla e inserisce un seme verificando la validazione.
La suite controlla anche i refresh e le diagnosi effettivamente invocati: dipendenze
modificate, file estranei, buffer non salvati, risorse mancanti e radici distinte.
La suite prova anche setup nuovo/vuoto, annullamenti, collisioni, Git facoltativo e
assente, setting annidato persistente e uso della cartella generata. Il comando reale
viene aperto e annullato con CDP senza un documento attivo. `tools/check-styles.mjs`
controlla gli iframe salvati dal vero host in Chromium, anche in modalità stampa:
cinque tipi, risposte lunghe senza sovrapposizioni, immagini/formule e assenza delle
classi legacy. PDF e screenshot sintetici sono in `test-results/`, ignorata da Git.

Per provare un VSIX senza il checkout del sorgente, installarlo in un profilo VS Code
separato e aprire una cartella dati. Il motore non deve importare file da repository
fratelli. Il manifest pubblicato non deve includere contenuti reali o percorsi personali.

`npm run docs:check` verifica collegamenti locali (anche maiuscole/minuscole),
ancore e presenza di tutti i comandi/settings nel riferimento. Con la radice
di un VSIX estratto come argomento controlla i documenti realmente distribuiti
e l’esclusione di quelli di sviluppo. I test di dominio validano tutorial ed
esempi pubblici; la suite Extension Host apre il comando guida senza un file dati
attivo. Per produrre e collaudare il pacchetto vedi [Distribuzione](distribuzione.md).

## Limiti verificabili

- Il drop usa la posizione del cursore e le API native; non disegna aree di drop
  personalizzate. Dentro un gruppo permette di scegliere il confine.
- Rinomina da Explorer aggiorna i documenti analizzabili. Un YAML sintatticamente
  invalido viene segnalato: non è possibile ricostruirne con certezza tutti gli usi.
- La validazione globale è esplicita. Una bozza errata estranea al documento corrente
  non deve impedire l'anteprima di quest'ultimo.
- L'equivalenza con lo strumento precedente misura i contenuti; la velocità del
  flusso di lavoro richiede anche una prova pratica. L’utilizzatore ha confermato
  maggiore fluidità il 15 ottobre 2026; è un esito qualitativo, senza nuove misure temporali.
