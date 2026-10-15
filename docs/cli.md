# CLI: validazione, PDF e migrazione

Documento per chi usa gli strumenti del repository, escluso dall’installazione.
[Indice per contribuire](../CONTRIBUTING.md) · [Architettura](ARCHITECTURE.md)

## Preparazione

Nel checkout del software usa Node.js compatibile con le dipendenze installate
(per lo sviluppo usare Node.js 22 o successivo) e npm:

```sh
npm ci
npm run build
```

La CLI non richiede VS Code né account LLM. I percorsi con spazi vanno racchiusi
fra virgolette. Il percorso dati può essere assoluto o relativo alla directory corrente.

## Comandi

```sh
node dist/cli.js validate /percorso/dati
node dist/cli.js pdf /percorso/dati contenuti/verifiche/esempio.yaml prova
node dist/cli.js pdf /percorso/dati contenuti/verifiche/esempio.yaml tutte
node dist/cli.js migrate /percorso/dati --report /percorso/report.json
node dist/cli.js migrate /percorso/dati --apply --report /percorso/report.json
```

| Comando                                            | Risultato                                                                                                                                                                                    |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `validate CARTELLA_DATI`                           | Legge esercizi e verifiche; scrive risultati JSON per verifica su stdout, errori di lettura/analisi su stderr. Exit code 1 se rileva errori, 0 altrimenti; gli avvisi non causano fallimento |
| `pdf CARTELLA_DATI FILE_VERIFICA [TRACCIA\|tutte]` | Genera i PDF e stampa i percorsi. Se la traccia è omessa usa la prima dichiarata. Gli errori causano exit code 1                                                                             |
| `migrate CARTELLA_DATI [--apply] [--report FILE]`  | Converte gli ID precedenti in percorsi. Senza `--apply` simula; il report è scritto solo se richiesto. Riepilogo JSON con conteggi e modalità                                                |

La migrazione rimuove gli ID dal front matter e aggiorna i riferimenti; controlla
il report, le revisioni e il confronto delle tracce prima di applicare. Conserva
una copia o una revisione dei dati. Il motore rifiuta applicazioni con errori o
sorgenti cambiati; non ripetere migrazioni già concluse senza motivo.

## Differenze rispetto all’estensione

- La CLI assume sempre `CARTELLA_DATI/contenuti`: non legge `contentDirectory`.
- Legge file salvati su disco, non buffer aperti e non salvati in VS Code.
- Non legge gli altri settings, inclusi `outputDirectory` e default di creazione.
- Usa `output` e `stili/predefinito.css` nel genitore dei contenuti; senza CSS
  personale usa quello incluso nel software.
- Per PDF richiede Chromium disponibile per la versione Playwright installata:
  esegui `npx playwright install chromium` nel checkout se manca.
- `validate` controlla la struttura degli esercizi; il rendering delle loro
  varianti viene verificato tramite le tracce che le usano. Il comando VS Code
  Controlla tutti i contenuti rende anche tutte le varianti: i due controlli
  non sono identici.

Il comando PDF non esegue preventivamente tutti i controlli globali: valida
l’archivio separatamente e ispeziona i PDF. Per il flusso ordinario dell’utente
consulta il [manuale dell’estensione](README.md).
