# Contribuire al software

Queste istruzioni riguardano il sorgente e restano nel repository; non sono
incluse nel VSIX. Il [manuale d’uso](docs/README.md) accompagna invece l’installazione.

| Compito                                   | Documenti da leggere                                                                                                                                                                                |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Qualsiasi intervento                      | [README](README.md), [ARCHITECTURE](docs/ARCHITECTURE.md), [istruzioni agenti](AGENTS.md) e sola attività pertinente nel [TODO](TODO.md)                                                            |
| Build, test, integrazione VS Code         | [Architettura e sviluppo](docs/ARCHITECTURE.md)                                                                                                                                                     |
| Produzione e verifica del VSIX            | [Distribuzione](docs/distribuzione.md)                                                                                                                                                              |
| CLI, validazione e migrazione             | [CLI](docs/cli.md)                                                                                                                                                                                  |
| Modifica dei formati o del loro contratto | Riferimento [esercizi](docs/riferimento/formato-esercizi.md) / [verifiche](docs/riferimento/formato-verifiche.md), poi [piano iniziale e checkpoint](docs/archivio-implementazione/PIANO-VSCODE.md) |
| Documentazione                            | Regole sotto e [controlli documentali](tools/check-docs.mjs)                                                                                                                                        |

## Manutenzione della documentazione

Mantieni una sola definizione delle regole nei riferimenti; le guide collegano
la regola e spiegano il compito. Ogni nuova funzione d’uso aggiorna la pagina
pertinente e, se cambia l’interfaccia, l’elenco di comandi/impostazioni.
Le procedure devono usare etichette reali e distinguere funzioni disponibili,
limiti correnti e lavoro ancora previsto. Non presentare collaudi aperti come eseguiti.

Usa esclusivamente esempi sintetici. La documentazione pubblica non deve imporre
percorsi personali né richiedere l’accesso a repository dati. Il manuale installato
deve avere tutti i collegamenti locali risolvibili nel VSIX e non includere
istruzioni per modificare, compilare o distribuire il software.

Esegui `npm run docs:check` per riferimenti e copertura del manifest, `npm test`
per gli esempi del manuale e i test di dominio. Per modifiche all’estensione
esegui anche build e, se coinvolta l’integrazione VS Code, Extension Host.
La suite verifica l’apertura effettiva della guida; per il pacchetto usa il
percorso isolato descritto in [Distribuzione](docs/distribuzione.md).

Prima di chiudere una consegna aggiorna TODO e, se cambia una previsione iniziale,
il piano. Registra separatamente documenti modificati, test eseguiti, pacchetto
prodotto e installazione/collaudo manuale. Il changelog «Non rilasciato» non
dimostra che sia stata pubblicata una nuova versione.
