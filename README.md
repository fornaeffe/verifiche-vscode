# Verifiche per VS Code

Estensione per creare e modificare verifiche ed esercizi nell'editor testuale di
Visual Studio Code, con anteprime, varianti e generazione di PDF. Prima versione
utilizzabile, da verificare sul proprio flusso quotidiano.

I contenuti sono file Markdown e YAML conservati in una cartella dati separata.
Questo repository contiene il software; non contiene verifiche o esercizi privati.

## Installazione e cartella dati

Installare il file `.vsix` con **Extensions: Install from VSIX…** e aprire la propria
cartella dati. È richiesto VS Code 1.100 o successivo. La cartella ha questa struttura:

```text
contenuti/
  esercizi/       # file .md, anche in sottocartelle
  verifiche/      # file .yaml o .yml
  allegati/       # immagini locali
stili/
  predefinito.css # facoltativo; sostituisce lo stile fornito
```

La posizione di `contenuti` è configurabile con `verifiche.contentDirectory`.
Non occorre avere il sorgente dell'estensione accanto ai dati. L'estensione lavora
nei workspace attendibili; dopo il setup funziona offline.

## Scrivere una verifica

1. Creare un file vuoto in `contenuti/verifiche` da Explorer e scegliere **Inserisci
   template verifica**. Nell'editor sono disponibili aggiunta traccia e inserimento
   blocchi prima/dopo o dentro un gruppo.
2. Scegliere **Esercizio** dal comando di inserimento. Selezionare un file esistente
   oppure **Nuovo esercizio…** e scegliere nome e cartella nella finestra di salvataggio.
3. Ctrl+click/F12 sul percorso apre l'esercizio. Le modifiche non salvate partecipano
   all'anteprima. Salvare normalmente con Ctrl+S o con l'Auto Save di VS Code.
4. Portare il cursore sulla riga della traccia desiderata dentro `versioni:` e aprire
   la lampadina: **Scegli variante per la traccia …** mostra direttamente le schede
   renderizzate. **Nessuna assegnazione** omette l'esercizio.

Le azioni **Elimina/Rinomina/Duplica traccia** compaiono nella lampadina quando il
cursore è nel blocco della traccia. I CodeLens restano riservati agli inserimenti,
per mantenere leggibile il documento.

La scorciatoia `Ctrl+Alt+Insert` (`Cmd+Alt+Insert` su macOS) apre l'inserimento blocco.
I comandi di inserimento sono disponibili anche dai CodeLens, dal menu contestuale e
dalla Command Palette cercando **Verifiche**. Ricerca, duplicazione dei file, cartelle
e organizzazione sono quelle native di VS Code. Per cambiare l'ordine dei blocchi
usare il testo YAML.

Un esercizio esistente inserito nella verifica riceve le varianti non vuote in ordine:
prima la traccia pubblica, poi le altre. Non vengono riciclate se le tracce sono più
numerose. Un esercizio appena creato e una traccia appena aggiunta restano senza
assegnazioni. Le modifiche strutturali sono annullabili con il normale comando Undo.

## Esercizi, immagini e riferimenti

Un file vuoto dentro `esercizi` propone i template A, SM, VF, Etichettare e Completamento.
Le varianti hanno comandi per aggiunta, duplicazione e rinomina con aggiornamento usi.
**Find All References** trova le verifiche che utilizzano un esercizio o una variante.

Incollare un'immagine dagli appunti o trascinarla nell'esercizio la copia negli allegati
e inserisce il riferimento Markdown. Il testo incollato normalmente resta testo.
Trascinare un file esercizio nella verifica propone l'inserimento strutturato; usare
il gesto nativo di VS Code (su alcune configurazioni tenere premuto Shift durante il
drop) e, se occorre, scegliere l'azione **Inserisci esercizio nella verifica**.

L'identificatore è il percorso relativo a `esercizi`, senza `.md`: per esempio
`scienze/esempio`. Non scrivere `id` nel front matter dell'esercizio. Rinomina e
spostamento da Explorer aggiornano gli usi nelle verifiche; le modifiche esterne
sono rilevate come riferimenti mancanti. Dopo l'aggiornamento salvare i documenti
modificati da VS Code. In presenza di YAML non analizzabili viene mostrato un avviso.

## Anteprima e PDF

L'anteprima segue il file attivo: varianti per un esercizio, traccia selezionata per
una verifica. Si può chiudere, riaprire con **Verifiche: Apri anteprima** o disabilitare
l'apertura automatica con `verifiche.autoPreview`.

Per il primo export, se Chromium non è presente, eseguire **Verifiche: Installa Chromium
per i PDF** (richiede Internet). **Esporta PDF** stampa la traccia corrente, **Tutti i PDF**
include anche quella pubblica. I file sono in `output/<verifica>/traccia-<traccia>.pdf`.
L'export include i contenuti correnti anche se non salvati. Errori di riferimenti,
formule o immagini bloccano la stampa interessata, senza impedire di salvare bozze.

## Strumenti da riga di comando

Nel checkout del software, dopo `npm ci` e `npm run build`:

```sh
node dist/cli.js validate /percorso/dati
node dist/cli.js migrate /percorso/dati --report /percorso/report.json
node dist/cli.js migrate /percorso/dati --apply --report /percorso/report.json
node dist/cli.js pdf /percorso/dati contenuti/verifiche/esempio.yaml tutte
```

La migrazione converte gli ID del formato precedente in percorsi e rimuove gli ID
dal front matter; senza `--apply` produce soltanto una simulazione. Conservare i dati
in Git e controllare il report e le modifiche. Non servono account LLM per usare CLI
o estensione.

Sviluppo e test: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
Licenza del software: [GNU GPL versione 3](LICENSE). Attribuzioni:
[THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md).
