# Architettura e sviluppo

`src/core.ts` analizza e rende Markdown/YAML. `src/document.ts` individua nodi e
intervalli del sorgente e produce modifiche circoscritte. `src/repository.ts` risolve
i percorsi e carica soltanto le dipendenze richieste; la cache degli esercizi è
limitata a 64 documenti ed è eliminabile.

`src/host.ts` adatta URI e buffer VS Code al motore. Le operazioni di anteprima/export
acquisiscono i testi dei buffer aperti all'inizio dello snapshot. `commands.ts` e
`providers.ts` applicano WorkspaceEdit, CodeLens, azioni, completamento, definizioni,
ricerca utilizzi, rinomina e trasferimenti di immagini/esercizi.

`preview.ts` tiene una sola webview: segue l'editor e passa temporaneamente al
selettore varianti. I contenuti sono in iframe senza script. CSS, font e immagini
necessari sono incorporati negli iframe, perché le risorse dei documenti srcdoc
non sono gestite come quelle del documento principale dal service worker VS Code.
Il pannello dei comandi usa messaggi validati rispetto al documento e alla sua
versione. I contenuti non ricevono il nonce degli script del pannello.

`pdf.ts` stampa tramite Chromium un insieme già acquisito di sorgenti e risorse.
Il server HTTP è temporaneo, su loopback e porta casuale; serve soltanto le risorse
precaricate. Non occorre avviare un'applicazione web separata.

`migration.ts` produce un piano e confronta tutte le tracce prima di applicare
modifiche. Un errore o una revisione cambiata impedisce l'applicazione; l'applicazione
è ripetibile. `cli.ts` espone migrazione, validazione e PDF anche senza VS Code.

## Comandi di sviluppo

```sh
npm ci
npm test
npm run build
npm run test:integration
npm run package
```

I test d'integrazione aprono una copia temporanea delle fixture in un Extension
Development Host isolato. Scaricano VS Code 1.100.0, oppure usano il percorso
`VSCODE_EXECUTABLE` se impostato. Verificano anche il selettore nella webview reale
attraverso una porta CDP locale effimera, usata soltanto dai test. Screenshot e log
sono esclusi da Git. F5 usa invece la configurazione in `.vscode/launch.json`.

Per provare un VSIX senza il checkout del sorgente, installarlo in un profilo VS Code
separato e aprire una cartella dati. Il motore non deve importare file da repository
fratelli. Il manifest pubblicato non deve includere contenuti reali o percorsi personali.

## Limiti verificabili

- Il drop usa la posizione del cursore e le API native; non disegna aree di drop
  personalizzate. Dentro un gruppo permette di scegliere il confine.
- Rinomina da Explorer aggiorna i documenti analizzabili. Un YAML sintatticamente
  invalido viene segnalato: non è possibile ricostruirne con certezza tutti gli usi.
- La validazione globale è esplicita. Una bozza errata estranea al documento corrente
  non deve impedire l'anteprima di quest'ultimo.
- L'equivalenza con lo strumento precedente misura i contenuti; la velocità del
  flusso di lavoro richiede anche una prova pratica con l'utilizzatore.
