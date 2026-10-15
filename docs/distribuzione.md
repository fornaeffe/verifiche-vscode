# Produrre e verificare il file installabile

Documento per chi distribuisce il software, escluso dal VSIX.
[Indice per contribuire](../CONTRIBUTING.md) · [Architettura](ARCHITECTURE.md)

## Prerequisiti e verifiche

Nel checkout del software usa Node.js 22 o successivo e npm. Non servono cartelle
dati personali. Lavora con fixture sintetiche e controlla lo stato Git iniziale.

```sh
npm ci
npm run docs:check
npm test
npm run build
npm run test:integration
npm run package
```

La suite Extension Host scarica VS Code 1.100.0 se necessario; i test PDF richiedono
Chromium disponibile per Playwright (`npx playwright install chromium` se manca).
`VSCODE_EXECUTABLE` permette di scegliere un eseguibile VS Code già presente.
La prima preparazione può richiedere Internet.

`npm run package` esegue build e `vsce package --no-dependencies`; anche il hook
`vscode:prepublish` esegue la build. Il risultato è
`verifiche-vscode-<versione>.vsix` nella radice, con la versione di `package.json`.
Il comando non esegue i test: completarli separatamente prima di distribuire.
Non pubblica sul Marketplace e non installa l’estensione nel profilo ordinario.

Per conservare separatamente un pacchetto di prova, crea `test-results` se manca
e usa `npm run package -- --out test-results/verifiche-prova.vsix`.
Non sovrascrivere pacchetti da conservare. I VSIX e `test-results/` sono ignorati da Git.

## Controllare il contenuto

`npx vsce ls --no-dependencies` elenca i file selezionati; un VSIX è anche un archivio
ZIP, con i file dell’estensione sotto `extension/`. La lista effettiva è regolata
da [`.vscodeignore`](../.vscodeignore).

Nel pacchetto devono essere presenti manifest, runtime compilato, risorse/licenze,
README, changelog, supporto e soltanto il manuale d’uso: indice, guide, riferimento,
risoluzione problemi, uso degli agenti sui contenuti ed esempi sintetici.
Devono essere assenti `CONTRIBUTING.md`, `AGENTS.md`, `TODO.md`, architettura,
CLI, distribuzione, archivio storico, sorgenti del repository, test e output reali.
I collegamenti relativi del manuale non devono puntare a documenti esclusi.

## Provare il pacchetto isolato

1. Estrai il VSIX in una cartella temporanea nuova; individua la sottocartella `extension`.
2. Imposta `VERIFICHE_EXTENSION_PATH` a quel percorso ed esegui dal checkout
   `npm run test:integration`. La suite carica il pacchetto estratto come estensione,
   in un profilo isolato con dati sintetici, e controlla anche **Apri guida**.
   Rimuovi la variabile a fine prova per tornare a testare il checkout.
3. Controlla i riferimenti del pacchetto con
   `node tools/check-docs.mjs /percorso/estrazione/extension`.
   Questa modalità verifica anche l’assenza dei documenti riservati al repository.
4. Per un collaudo manuale installa il VSIX da **Extensions: Install from VSIX…**
   in un profilo VS Code separato, apri una cartella dati sintetica e prova guida,
   collegamenti e tutorial fino ai PDF. Il sorgente non deve essere necessario.

L’esecuzione automatica sul pacchetto estratto non equivale all’installazione
manuale nel profilo ordinario. Registra distintamente gli esiti e gli eventuali
collaudi ancora aperti, inclusi quelli su sistemi operativi non provati.

## Preparare una release

Aggiorna versione e changelog soltanto quando prepari effettivamente una release;
mantieni coerente la versione nel lockfile. Ricrea e ricontrolla il VSIX dopo
qualsiasi modifica. Distribuzione su GitHub o pubblicazione sul Marketplace
sono azioni successive esplicite: la sola produzione del file non le esegue.
