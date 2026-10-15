# Lavoro sull’estensione Verifiche

## Documentazione da leggere

- Per ogni intervento: `README.md`, `docs/ARCHITECTURE.md` e la sola attività
  pertinente in `TODO.md`. Tenere le istruzioni concise e separate per compito.
- Per orientarsi per compito: `CONTRIBUTING.md`. Manuale d’uso in `docs/README.md`,
  formati in `docs/riferimento`, CLI in `docs/cli.md`, pacchetto in `docs/distribuzione.md`.
  Solo il manuale d’uso accompagna il VSIX; non collegarlo a documenti locali esclusi.
- Per contratti e decisioni iniziali: `docs/archivio-implementazione/PIANO-VSCODE.md`
  e il suo checkpoint finale. `PROMPT.md` e `PROPOSTA.md` nella stessa cartella sono
  documenti storici; la proposta web è superata dal piano VS Code.
- Aggiornare TODO dopo una consegna verificata e il piano se cambia lo stato di una
  sua previsione, distinguendo codice presente, test eseguiti e prove ancora aperte.

## Codice e verifiche

- Il codice dell’estensione è in questo repository. Mantenerlo indipendente da
  qualsiasi archivio personale; l’installazione non richiede checkout dati fratelli.
- Usare solo fixture sintetiche nei test, negli screenshot e nella documentazione pubblica.
  Non trasferire contenuti, report, screenshot o diari operativi reali nel pubblico.
- Preservare il testo non coinvolto nelle modifiche strutturali. Gli ID esercizio
  sono percorsi relativi senza `.md`; non reintrodurre ID nel front matter.
- Eseguire `npm test` e `npm run build` per modifiche al dominio o all’estensione;
  eseguire anche la suite Extension Host per modifiche all’integrazione VS Code o
  alla webview. Per modifiche solo documentali eseguire `npm run docs:check` e
  verificare il diff; se cambiano esempi eseguibili, anche `npm test`.

## Interventi su dati privati

Leggere le istruzioni e il checkpoint più recente nella cartella dati interessata,
se l’intervento la coinvolge. Controllare separatamente lo stato Git dei repository
e conservare revisioni, report di migrazione e risultati reali soltanto nel diario
privato. Le istruzioni pubbliche non devono imporre percorsi o nomi locali.
