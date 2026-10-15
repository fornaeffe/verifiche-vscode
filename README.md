# Verifiche per VS Code

Crea esercizi e verifiche in Markdown/YAML nell’editor di Visual Studio Code,
con varianti, tracce differenziate, anteprima e generazione di PDF A4.
I contenuti restano file locali nella tua cartella dati. Non servono account LLM
né il codice sorgente dell’estensione; dopo l’installazione di Chromium puoi lavorare offline.

## Iniziare

1. Installa il file `.vsix` con **Extensions: Install from VSIX…** nel menu della
   vista Estensioni. Serve **VS Code desktop 1.100 o successivo** e un workspace attendibile.
2. Dalla Command Palette esegui **Verifiche: Crea cartella dati…**. Scegli una
   cartella nuova o vuota; Git locale è facoltativo.
3. Apri **Verifiche: Apri guida** e segui [La prima verifica](docs/guida/prima-verifica.md),
   dalla creazione di un esercizio al primo PDF.

La guida è inclusa nell’estensione e consultabile offline. Il setup crea soltanto
la struttura dei dati, senza esempi: il manuale contiene [esempi sintetici](docs/esempi/README.md)
da copiare facoltativamente.

## Utilizzo

- [Manuale e glossario](docs/README.md)
- [Scrivere esercizi, varianti, immagini e formule](docs/guida/esercizi.md)
- [Comporre verifiche, tracce e punteggi](docs/guida/verifiche.md)
- [Organizzare l’archivio e aggiornare i riferimenti](docs/guida/archivio.md)
- [Anteprima, stile e PDF](docs/guida/anteprima-pdf.md)
- [Formato esercizi](docs/riferimento/formato-esercizi.md) e [formato verifiche](docs/riferimento/formato-verifiche.md)
- [Comandi, scorciatoie e impostazioni](docs/riferimento/comandi-impostazioni.md)
- [Risoluzione dei problemi](docs/risoluzione-problemi.md) e [uso con agenti](docs/uso-con-agenti.md)

## Supporto e novità

Per domande e suggerimenti usa le [Discussions](https://github.com/fornaeffe/verifiche-vscode/discussions)
del [repository GitHub](https://github.com/fornaeffe/verifiche-vscode);
per difetti riproducibili apri una [Issue](https://github.com/fornaeffe/verifiche-vscode/issues).
Leggi [come richiedere supporto](SUPPORT.md) e le [novità](CHANGELOG.md).

La documentazione per contribuire al software è nel
[repository](https://github.com/fornaeffe/verifiche-vscode/blob/main/CONTRIBUTING.md).
Licenza del software: [GNU GPL versione 3](LICENSE). [Attribuzioni](THIRD-PARTY-NOTICES.md).
I tuoi contenuti rimangono separati dal software.
