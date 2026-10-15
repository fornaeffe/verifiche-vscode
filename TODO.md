# Attività aperte

## Miglioramenti raccolti durante l’uso

- [ ] Esporre in settings i nomi di default (ad esempio il nome di default della prima variante) e il percorso di output
- [ ] Documentare la produzione del file installabile dell'estensione

## Previsioni del piano iniziale ancora parziali

Revisione del 15 ottobre 2026: confronto tra
[PIANO-VSCODE.md](docs/archivio-implementazione/PIANO-VSCODE.md) e sorgenti.
Le checkbox delle fasi non esaurivano tutti i dettagli dei contratti. Queste attività
registrano le differenze; non sono state implementate in questa revisione.

- [ ] **Aggiornamenti sulle sole dipendenze attive** (piano §3, F2/F5): conservare
  l’insieme dei riferimenti dell’anteprima e aggiornare solo quando cambiano quei
  documenti o risorse. In `src/extension.ts` ogni modifica nell’albero dei contenuti
  rilancia diagnostica dei documenti visibili e refresh dell’anteprima, anche se estranea.
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

- [ ] **Finestra nativa di creazione esercizio** (F1/F4): registrare la prova di
  selezione cartella/nome, annullamento senza file o riferimento residuo e recupero
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
  tastiera fisica dell’utilizzatore e su macOS/Linux; creare/installare il VSIX della
  versione aggiornata e verificarlo nel profilo ordinario. I test Windows con CDP
  sono riusciti; il checkpoint della scorciatoia non documenta un nuovo VSIX installato.

## Completato

- [x] **Popolamento automatico delle nuove tracce**: prima variante non vuota libera nell’ordine del file, contando tutte le tracce e gli usi effettivi di `default`. Gli usi ripetuti dello stesso esercizio riservano varianti distinte nell’ordine dei blocchi, anche annidati; esaurite le varianti, assegnazione esplicita `''`. Verificati test di dominio, build ed Extension Host con buffer non salvati, esaurimento, annulla/ripristina e assenza di modifiche parziali su esercizi mancanti o malformati. Nessun nuovo VSIX creato o installato.
- [x] Gli esercizi aggiunti tramite comando o drop ricevono `punti: 1`, salvo nei gruppi con punteggio (anche `0`, inclusi gli antenati). Opzione `verifiche.defaultExercisePoints` nei settings, attiva per default. Verificati test di dominio, build ed Extension Host con cambio impostazione e annulla/ripristina.
- [x] Inserimento formula chimica con `Ctrl+K`, poi `Ctrl+Alt+H` (`Cmd+K`, poi `Cmd+Alt+H` su macOS): aggiunge `$\ce{}$` con il cursore tra le parentesi graffe. Verificati assenza di conflitti predefiniti e pressione effettiva della sequenza su Windows.
