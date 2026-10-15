# Comandi, scorciatoie e impostazioni

[Indice del manuale](../README.md)

## Comandi

Apri la Command Palette e cerca **Verifiche**. Le voci sono elencate sotto con
il nome visualizzato, senza il prefisso comune «Verifiche:».
Salvo guida, setup dati e installazione Chromium, i comandi richiedono il documento
dati pertinente aperto; per l’export apri la verifica e controlla la traccia nell’anteprima.

| Nome                        | ID                                | Contesto e accessi aggiuntivi                                                                            |
| --------------------------- | --------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Apri guida                  | `verifiche.openGuide`             | Indice del manuale locale, anche senza documenti                                                         |
| Crea cartella dati…         | `verifiche.createDataFolder`      | Setup anche senza documenti; nuova finestra                                                              |
| Inserisci template          | `verifiche.template`              | File dati vuoto; CodeLens per verifica e per ciascun tipo esercizio. Dalla Palette il tipo esercizio è A |
| Apri anteprima              | `verifiche.preview`               | File esercizio/verifica; pulsante nel titolo editor e menu contestuale                                   |
| Inserisci blocco            | `verifiche.addBlock`              | Verifica, posizione del cursore; CodeLens prima/dopo/dentro gruppo e menu contestuale                    |
| Aggiungi traccia            | `verifiche.addTrace`              | Verifica; CodeLens sopra le tracce                                                                       |
| Elimina traccia             | `verifiche.deleteTrace`           | Verifica; lampadina sulla traccia e conferma eliminazione                                                |
| Rinomina traccia            | `verifiche.renameTrace`           | Verifica; lampadina sulla traccia                                                                        |
| Duplica traccia             | `verifiche.duplicateTrace`        | Verifica; lampadina sulla traccia                                                                        |
| Scegli variante             | `verifiche.chooseVariant`         | Cursore nel blocco esercizio della verifica; lampadina nella mappa `versioni`                            |
| Aggiungi variante           | `verifiche.addVariant`            | Esercizio; CodeLens                                                                                      |
| Duplica variante            | `verifiche.duplicateVariant`      | Esercizio; CodeLens sulla variante                                                                       |
| Rinomina variante           | `verifiche.renameVariant`         | Esercizio; CodeLens, aggiornamento degli utilizzi                                                        |
| Inserisci formula chimica   | `verifiche.insertChemicalFormula` | Editor dati scrivibile; snippet `$\ce{}$`                                                                |
| Esporta traccia PDF         | `verifiche.export`                | Verifica; pulsante Esporta PDF nell’anteprima                                                            |
| Esporta tutti i PDF         | `verifiche.exportAll`             | Verifica; pulsante Tutti i PDF, inclusa la pubblica                                                      |
| Installa Chromium per i PDF | `verifiche.installBrowser`        | Download del browser, Internet necessario                                                                |
| Controlla tutti i contenuti | `verifiche.validate`              | File dati attivo; controlla la sua cartella dati e scrive nel canale Output Verifiche — controllo        |

Le azioni contestuali possono passare già la traccia o la variante; dalla Palette
il comando può chiedere una scelta. Il cursore e il documento attivo sono quindi rilevanti.

## Scorciatoie e funzioni native

| Azione                          | Windows/Linux              | macOS                    |
| ------------------------------- | -------------------------- | ------------------------ |
| Inserisci blocco nella verifica | `Ctrl+Alt+Insert`          | `Cmd+Alt+Insert`         |
| Inserisci formula chimica       | `Ctrl+K`, poi `Ctrl+Alt+H` | `Cmd+K`, poi `Cmd+Alt+H` |
| Command Palette (VS Code)       | `Ctrl+Shift+P`             | `Cmd+Shift+P`            |
| Azioni lampadina (VS Code)      | `Ctrl+.`                   | `Cmd+.`                  |
| Vai alla definizione (VS Code)  | `F12`                      | `F12`                    |

Le prime due sono registrate dall’estensione; le altre sono azioni native.
Tastiera, sistema operativo e personalizzazioni possono cambiare i gesti:
usa **Keyboard Shortcuts** di VS Code per cercare il comando e assegnare una combinazione.
Ricerca, duplicazione dei file, salvataggio, Undo/Redo e **Find All References**
usano le funzioni native. Il drop usa le API di VS Code e può richiedere Shift
o la scelta dell’azione nel selettore del drop.

## Impostazioni

Nei Settings cerca `@ext:fornaeffe.verifiche-vscode`. Le opzioni con ambito risorsa
possono essere configurate per utente, workspace o singola cartella di un workspace
multiplo. `autoPreview` ha ambito finestra, quindi non è distinto per singola cartella.

| Impostazione                        | Default              | Effetto                                                               |
| ----------------------------------- | -------------------- | --------------------------------------------------------------------- |
| `verifiche.contentDirectory`        | `contenuti`          | Percorso dei contenuti relativo alla cartella workspace               |
| `verifiche.autoPreview`             | `true`               | Apertura automatica dell’anteprima quando si attiva un documento dati |
| `verifiche.defaultExercisePoints`   | `true`               | `punti: 1` ai nuovi inserimenti, salvo gruppo antenato con punti      |
| `verifiche.defaultVariantName`      | `base`               | Prima variante dei nuovi template esercizio, anche Nuovo esercizio…   |
| `verifiche.defaultPublicTraceId`    | `prova`              | ID pubblico nei nuovi template verifica                               |
| `verifiche.defaultFirstTraceId`     | `1`                  | ID della prima traccia ordinaria nei nuovi template verifica          |
| `verifiche.defaultExerciseFileName` | `nuovo-esercizio.md` | Nome proposto nel dialogo Nuovo esercizio…                            |
| `verifiche.outputDirectory`         | `output`             | Destinazione PDF relativa alla radice workspace, oppure assoluta      |

I default di creazione non rinominano i documenti esistenti. Hanno effetto dal
comando successivo senza riavvio. I nuovi ID traccia e nomi variante ammettono
lettere ASCII, numeri, `_`, `-`, esclusi `default`, `undefined`, `__proto__`,
`constructor`, `prototype`; i due ID iniziali devono essere diversi.
Le tracce aggiunte dopo il template usano il primo numero libero. Aggiunta e
rinomina variante continuano a chiedere un nome.

Il nome file proposto deve essere un semplice nome `.md` valido anche su Windows,
senza cartelle. Puoi cambiarlo nella finestra di salvataggio. Un default invalido
blocca soltanto il comando interessato e il messaggio indica l’impostazione da correggere.

`outputDirectory` crea le cartelle mancanti e sovrascrive PDF omonimi, conservando
le sottocartelle delle verifiche. Non espande variabili `${…}`, `~` o URI;
usa un percorso nativo del sistema. Il CSS resta in `stili/predefinito.css`
nella radice workspace anche cambiando destinazione PDF o annidando i contenuti.
Per `contentDirectory` e modifiche alla struttura consulta [Archivio](../guida/archivio.md).
