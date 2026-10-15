# Piano operativo: editor di verifiche in VS Code

Aggiornato: 15 ottobre 2026. Archivio dell’implementazione iniziale: estensione pubblicata GPL-3.0 e collaudo quotidiano positivo riferiti dall’utilizzatore. Restano attività puntuali e prove elencate in [TODO.md](../../TODO.md).

Questo piano conserva contratti e criteri dell’implementazione iniziale. Sostituisce le indicazioni incompatibili della [proposta web](PROPOSTA.md) e del [prompt originario](PROMPT.md). Per l’uso corrente leggere [README.md](../../README.md), per lo sviluppo [ARCHITECTURE.md](../ARCHITECTURE.md) e per le attività aperte [TODO.md](../../TODO.md). I nuovi miglioramenti nel TODO possono modificare le regole iniziali: non considerarli già implementati. Aggiornare il piano quando si verifica una sua consegna; distinguere codice presente, collaudi eseguiti e prove ancora aperte.

## 1. Obiettivo e decisioni approvate

Creare e modificare verifiche ed esercizi con uno sforzo non superiore al precedente strumento XML. Il riferimento è il flusso completo, compresi ricerca, cambi di documento, correzioni, immagini e stampa, non soltanto il numero di click di un singolo comando.

- Estensione VS Code desktop: Explorer e editor testuale nativi; webview laterale per anteprime e selezione delle varianti.
- Conservare l'impostazione file/cartelle e la sintassi Markdown/YAML, introducendo le modifiche necessarie ai riferimenti e alle bozze.
- Nessun obbligo di mantenere funzionante o compatibile la UI web. La versione precedente è recuperabile da Git.
- Codice dell’estensione in questo repository pubblico `verifiche-vscode`, con licenza GPL-3.0-only. I dati personali restano in una cartella separata e privata, senza posizione obbligata rispetto al software.
- ID esercizio = percorso relativo a `contenuti/esercizi`, senza `.md`, con `/` anche su Windows. Nessun ID nel front matter.
- Aggiornare i riferimenti per rinomine/spostamenti da Explorer, inclusi spostamenti di cartelle. Accettare il rischio di operazioni esterne, segnalandone i riferimenti mancanti.
- Nuova traccia: prima variante non vuota non ancora utilizzata nella verifica, nell’ordine testuale; esaurite le varianti, assegnazione esplicita `''`. Regola aggiornata il 15 ottobre 2026.
- Nuovo esercizio inserito nella verifica: nessuna assegnazione. Non associare automaticamente varianti vuote o segnaposto.
- Assegnazione sequenziale: ordine delle tracce dichiarato e ordine testuale delle varianti; traccia pubblica prima, destinataria della prima variante per default. Tracce eccedenti senza assegnazione, senza riciclo automatico.
- Focus sull'esercizio: anteprima delle sue varianti, anche se aperto dalla verifica. Focus sulla verifica: anteprima della verifica.
- Selettore varianti: modalità temporanea dello stesso pannello laterale.
- Incolla immagini e drop immagini richiesti nella nuova versione.
- Duplicazione, organizzazione/spostamento dei file e ricerca affidati a Explorer e alle funzioni native VS Code. Nessun explorer, motore di ricerca o catalogo visuale proprietario.
- Bozze incomplete salvabili; gli errori interessati bloccano l'export, non il salvataggio.
- Formati leggibili e motore separato dall'editor per consentire anche uso da CLI e futura automazione con LLM, senza imporre un servizio o modello.

Per l'ordine della traccia pubblica, il template la crea al primo posto. Se un documento esistente la colloca altrove, il comando di assegnazione usa prima la pubblica e poi le altre nell'ordine dichiarato, senza riordinare il sorgente. Questa è la regola operativa proposta per rendere esplicito il default richiesto.

## 2. Repository, distribuzione e confine pubblico/privato

Esempio di separazione; i due checkout possono trovarsi in posizioni indipendenti:

```text
verifiche-vscode/                # questo repository del software, pubblico
  src/                          # motore, integrazione VS Code, webview
  test/fixtures/                # soli esempi sintetici pubblicabili
  tools/                        # strumenti generici di sviluppo e test
  docs/
    ARCHITECTURE.md              # sviluppo corrente
    archivio-implementazione/   # piano, prompt e proposta storici
  AGENTS.md
  TODO.md
  LICENSE                       # GPL-3.0
  package.json

dati-privati/                   # esempio di cartella dati, non inclusa nel software
  contenuti/esercizi/
  contenuti/verifiche/
  contenuti/allegati/
  stili/
  output/                       # generato, non versionato
```

Il software installato deve funzionare aprendo soltanto il repository dati: la cartella del sorgente dell'estensione non è una dipendenza runtime. Rilevare la radice dei contenuti dal workspace/configurazione, mai da `process.cwd()` o da un percorso personale cablato. Se ci sono più radici dati, risolvere il documento rispetto alla propria radice e chiedere una scelta solo dove il contesto è ambiguo.

Dal setup 0.1.4, **Verifiche: Crea cartella dati…** prepara una destinazione nuova
o vuota con struttura, `.gitkeep`, README, `.gitignore` e copia personalizzabile del
CSS incluso, ripulito dalle classi legacy. Git locale è facoltativo e non comporta
commit o pubblicazione. Il comando conserva il `contentDirectory` non standard
nella nuova cartella; annullamenti precedono le scritture, collisioni non sovrascrivono
file ed errori parziali elencano gli elementi creati. Uso corrente nel README;
collaudo dei dialoghi nativi distinto nel TODO.

Recuperare selettivamente il codice utile di `app/core.ts`, `app/pdf.ts`, template e test. Rifattorizzarlo in questo repository: niente import runtime verso il codice della precedente applicazione nella cartella dati, né pacchetti locali che richiedano l'accesso al repo privato. Nuova storia Git autonoma: non copiare `.git`, l'intero progetto o l'archivio nel repo pubblico. Esempi, screenshot, test e report pubblici devono usare contenuti sintetici. I risultati dell'audit sui dati reali restano nel repo privato o in output esclusi dal versionamento.

Nella fase di distribuzione aggiungere testo GPL versione 3, metadati di licenza coerenti (default operativo GPL-3.0-only), attribuzioni e avvisi delle dipendenze distribuite; inventariare provenienza e licenze del codice e degli asset riutilizzati. Non applicare la licenza del software ai dati privati. Il repository è stato pubblicato, come confermato dall’utilizzatore il 15 ottobre 2026; questa riorganizzazione documentale non esegue ulteriori pubblicazioni.

Il codice web esistente può essere eliminato quando le funzioni utili sono estratte e verificate, senza un periodo di doppio supporto. Conservare nella cartella dati privata contenuti, stili personalizzati, istruzioni d'uso e report privati. I vecchi script di audit che confrontano XML potranno restare strumenti locali di migrazione; il software pubblico non deve dipendere dall’archivio XML precedente.

## 3. Lettura dei contenuti: niente archivio completo residente

Dimensionamento di riferimento: centinaia di esercizi e decine di verifiche, con crescita prevista di tre volte. Usare fixture sintetiche per le misure pubbliche; inventari e misure dell’archivio personale restano nella documentazione privata. Questa scala non richiede di per sé un database o un indice sofisticato: la scelta dipende soprattutto dalla semplicità e dalla correttezza rispetto ai documenti non salvati.

Decisione: risolvere su richiesta i riferimenti coinvolti; nessun caricamento e parsing globale all'avvio, nessun archivio persistente parallelo ai file. Usare una piccola cache eliminabile per evitare letture e parsing ripetuti durante la digitazione.

| Operazione | Letture necessarie |
| --- | --- |
| Anteprima esercizio | Documento corrente e relativi allegati |
| Anteprima verifica | Verifica corrente e soli esercizi referenziati |
| Tutti i PDF | Stessa verifica e un insieme condiviso dei suoi riferimenti |
| Scelta file esercizio | Elenco URI/percorso ottenuto su richiesta; leggere il contenuto solo quando utile |
| Rinomina esercizio/cartella, trova utilizzi | Scansione su richiesta delle verifiche |
| Rinomina variante | Scansione verifiche, limitando la modifica agli usi di quell'esercizio |
| Migrazione e controllo globale | Scansione completa esplicita con progresso, cancellazione e report |

Regole di implementazione:

1. I documenti aperti sono la fonte prioritaria, con la loro versione e le modifiche non salvate. Il disco è la fonte per quelli chiusi.
2. Cache per URI e versione del documento; per i file chiusi invalidazione su eventi filesystem e verifica di revisione dove serve. Dimensione limitata e cancellazione alla chiusura del workspace. Non trattenere tutti gli allegati come buffer.
3. Conservare soltanto le dipendenze delle anteprime attive per aggiornarle quando cambia un esercizio o un allegato; nessun grafo globale permanente nella prima versione.
4. Scansioni asincrone, cancellabili; risultati obsoleti scartati se nel frattempo cambia il documento.
5. Una verifica aperta deve continuare a funzionare se un file estraneo è vuoto o errato. L'errore di una dipendenza è invece mostrato nel contesto interessato.
6. Prima di applicare modifiche da una scansione controllare che le revisioni siano ancora valide; ricalcolare anziché sovrascrivere modifiche intervenute nel frattempo.

Misurare su fixture sintetiche alla scala di riferimento e a 3×; eventuali misure su dati reali restano private. Introdurre ulteriori indici solo davanti a un collo di bottiglia misurato. Non eseguire una scansione completa a ogni battuta o refresh dell'anteprima.

## 4. Contratto dell'editor e flussi

### 4.1 Controlli e modifica del testo

CodeLens sui punti strutturali, azioni contestuali e scorciatoie; hover per informazioni supplementari, non come unico accesso alle azioni frequenti. Non promettere pulsanti arbitrari in coda a ogni riga: il prototipo deve scegliere l'interazione nativa più efficace.

Il motore delle operazioni restituisce modifiche testuali circoscritte, con intervalli del sorgente. Preservare commenti, terminatori di riga, rientri, ordine e contenuti non coinvolti; evitare `parse -> stringify` dell'intero file. Parser YAML con posizioni dei nodi; parser dei blocchi variante con intervalli nel Markdown. Parsing parziale per navigazione e diagnostica durante la scrittura; disabilitare solo le azioni strutturali il cui contesto non è determinabile.

Applicare modifiche tramite le API documentali VS Code. Verificare annulla/ripristina per testo, modifiche multi-file e creazione file; non dare per scontata l'atomicità su filesystem di tutte le operazioni. Annullamento di un selettore non modifica il documento. Dopo un inserimento portare il cursore al campo da scrivere, conservando il contesto.

### 4.2 Nuovi file e aggiunta esercizio

- File `.yaml`/`.yml` vuoto dentro verifiche: proposta non modale «Inserisci template verifica», una sola azione. Titolo provvisorio dal nome file, traccia pubblica e prima ordinaria con ID configurabili nei settings e lista blocchi vuota modificabile.
- File `.md` vuoto dentro esercizi: «Inserisci template esercizio», una sola azione per il minimo; scelta dei tipi disponibile separatamente. Nome della prima variante configurabile per tutti i template, anche creando un esercizio dalla verifica; nome file proposto configurabile nella finestra di salvataggio. Nessun ID scritto nel file.
- Aggiungi blocco prima/dopo: selettore del tipo; template immediato per gruppo, istruzioni, contenuto e salto pagina. Azione dedicata dentro liste/gruppi vuoti.
- Aggiungi esercizio esistente: selettore nativo ricercabile di percorsi, con scelta «Nuovo esercizio…». Non costruire una ricerca per contenuto alternativa a quella di VS Code.
- Nuovo esercizio dal comando: finestra nativa di salvataggio per cartella e nome, modello minimo, apertura della scheda e inserimento del riferimento. Partire dalla cartella contestuale selezionata, se pertinente, altrimenti dalla radice esercizi; non implementare inizialmente una gerarchia di euristiche su ultimo percorso ed esercizio precedente. Creazione anche da Explorer, seguita da inserimento nella verifica, sempre supportata.
- Se l'utente annulla la scelta del percorso non creare né riferimento né file. In caso di errore parziale spiegare quali modifiche sono avvenute e consentire recupero, senza lasciare un riferimento apparentemente valido a un file assente.
- Nuovo esercizio: chiavi delle tracce esplicitamente associate a `''`; template con variante da compilare, mai assegnata automaticamente.
- Esercizio esistente inserito o trascinato: assegnazioni in sequenza alle varianti non vuote, con la regola della pubblica. Non riassegnare automaticamente quando l'utente modifica successivamente l'esercizio.

### 4.3 Tracce, gruppi e associazioni

- Aggiungi traccia: ID valido univoco generato; la modifica immediata dell’ID resta nel TODO. Per ogni uso esercizio, anche annidato, assegnare la prima variante non vuota libera nell’ordine testuale. Contare gli usi effettivi di tutte le tracce, inclusa la pubblica e il ripiego `default`; un `default` coperto non occupa la variante. Riservare per ID esercizio anche le nuove assegnazioni, nell’ordine dei blocchi. Esaurite le varianti, scrivere `''`: l’assenza della chiave attiverebbe `default`. Leggere anche i buffer non salvati; un esercizio mancante o non analizzabile interrompe l’operazione senza modifiche parziali.
- Verifica della regola di assegnazione, 15 ottobre 2026: test di dominio (ordine numerico, `default`, omissioni, gruppi annidati, usi ripetuti e CRLF), build ed Extension Host su VS Code 1.100.0 superati; provati buffer non salvati, esaurimento, Undo/Redo ed errori di lettura/parsing senza modifiche parziali. Nessun nuovo pacchetto o installazione nel profilo ordinario.
- Elimina traccia: conferma e rimozione da tutte le mappe `versioni`, anche istruzioni e contenuti. Se una mappa diventa vuota, la bozza deve restare rappresentabile. Impedire dal comando la rimozione dell'ultima traccia; una cancellazione manuale resta salvabile con diagnostica.
- Per istruzioni/contenuti della nuova traccia mantenere `testo` o l'eredità `default`; se manca un valore risolvibile, indicare l'incompletezza senza inventare testo.
- Rinomina traccia e variante: aggiornare semanticamente i relativi utilizzi; non sostituire indiscriminatamente stringhe nel testo.
- Duplica traccia e variante: operazioni sul contenuto strutturato, distinte dalla duplicazione di file già fornita da Explorer.
- Variante inesistente e assegnazione esplicitamente vuota sono casi diversi: la prima è errore, la seconda omette esercizio, numerazione e punti. Differenze fra totali delle tracce producono avviso.
- Completamento dei percorsi e nomi variante, navigazione al file/variante e «Trova utilizzi». Una modifica a un esercizio condiviso si riflette su tutti gli utilizzi; per una copia indipendente usare la duplicazione nativa del file e cambiare il riferimento.
- Organizzazione dei file via Explorer. L'ordine dei blocchi nella verifica è invece nel YAML: usare selezione, taglia/incolla e spostamento righe nativi, con supporto a rientri/diagnostica. Non aggiungere una UI di riordino o un compositore a matrice.

### 4.4 Drop esercizi, immagini e appunti

Provare presto il gesto di drop dall'Explorer verso l'editor, incluse le eventuali combinazioni di tasti richieste da VS Code. Non basare il prodotto su aree di drop personalizzate non disponibili nelle API stabili.

- Drop esercizio: identificare un confine strutturale valido nella lista destinazione; all'interno di un blocco proporre una regola coerente prima/dopo e gestire esplicitamente ingresso/uscita dai gruppi. Se ambiguo, scelta breve invece di inserimento silenzioso nel gruppo sbagliato.
- Riutilizzare lo stesso comando di inserimento del selettore e le stesse regole di assegnazione.
- Aggiunta del 15 ottobre 2026: comando e drop assegnano `punti: 1`, salvo nei gruppi con punteggio, inclusi gli antenati. La regola è disattivabile con `verifiche.defaultExercisePoints` (default `true`); verificati test di dominio, build ed Extension Host con cambio impostazione e annulla/ripristina.
- Drop immagine e incolla immagine binaria: copiare in `contenuti/allegati`, evitare sovrascritture con nome univoco, inserire riferimento Markdown compatibile con rendering e PDF. Nessun percorso assoluto nel contenuto.
- Se l'immagine è già negli allegati della stessa radice, riusare il riferimento. Copiare immagini esterne; non scaricare URL remoti implicitamente.
- Conservare la sintassi corrente di dimensioni e disposizione (`width`, `float`) e il supporto ai riferimenti legacy agli allegati.
- Verificare sia dati binari degli appunti sia file/URI da Explorer; non intercettare il normale incolla testo Markdown/YAML.
- Gestire annullamento e fallimenti: niente collegamenti a file non creati; annullare il testo non deve cancellare un allegato ormai usato altrove. Evitare una pulizia automatica distruttiva degli allegati.

### 4.5 Anteprime, selezione varianti ed export

- Una webview laterale richiudibile. Ricordare traccia e scorrimento per verifica.
- Documento esercizio attivo: visualizzare le varianti nell'ordine del file. Documento verifica attivo: visualizzare la traccia selezionata. Il focus su Explorer o sul pannello stesso non deve cancellare l'anteprima.
- Modalità selezione variante: memorizzare documento, intervallo, traccia e versione sorgente dell'associazione. Mostrare tutte le varianti con contenuto renderizzato e scelta «nessuna assegnazione». Click o Invio applicano; Esc annulla. Dopo la scelta tornare alla verifica e al suo punto di lavoro. Se cambia il sorgente, rivalidare il bersaglio.
- Passaggio esplicito a un altro documento chiude la selezione temporanea senza applicarla e mostra l'anteprima di quel documento.
- Aggiornamento breve e ritardato durante la digitazione; scartare risposte obsolete. Anteprima errata: messaggio chiaro, niente risultato vecchio presentato come corrente.
- Snapshot coerente di verifica ed esercizi, inclusi buffer non salvati, condiviso fra anteprima ed export. Il PDF non deve rileggere silenziosamente versioni diverse dal disco; non forzare il salvataggio di tutti i documenti.
- Export traccia corrente o tutte (pubblica inclusa), destinazione configurabile con `verifiche.outputDirectory`: relativa alla radice workspace della verifica oppure assoluta, anche esterna ai dati. Default `output`, indipendente dalla profondità di `contentDirectory`; conservare sottocartelle della verifica e nomi `traccia-<id>.pdf`. La CLI mantiene il default nel genitore dei contenuti e non legge i settings VS Code. Stili e allegati risolti rispetto ai dati; risorse dell'estensione risolte rispetto alla sua installazione.
- Riutilizzare Playwright per la stampa; prevedere installazione di Chromium, gestione errori, attesa immagini/font e lavoro offline dopo il setup. Non dipendere dal vecchio server web permanente; un servizio locale temporaneo interno all'export è una scelta implementativa possibile.
- Distinguere anteprima HTML da resa paginata del PDF; verificare impaginazione reale su campioni. Isolare HTML dei contenuti dai comandi della webview e limitare accesso alle risorse locali necessarie.

## 5. Migrazione degli ID

1. Enumerare gli esercizi e costruire la mappa ID attuale -> percorso relativo senza estensione, usando l'ID esplicito o il comportamento precedente dove implicito.
2. Segnalare duplicati, collisioni di percorsi anche per maiuscole/minuscole su Windows, riferimenti mancanti e file non analizzabili; nessuna correzione arbitraria.
3. Riconoscere entrambe le forme attuali (`esercizio: nome` e `esercizio: {id: nome, ...}`), gruppi annidati e tutti gli usi effettivi.
4. Preparare modifiche minime ai riferimenti e rimozione del solo campo `id` del front matter esercizio, preservando gli altri metadati.
5. Simulazione con report privato, confronto revisioni prima della scrittura e procedura ripetibile: una seconda esecuzione non deve modificare nuovamente il risultato.
6. Confrontare, a parità di contenuti, varianti risolte, ordine, conteggio e punteggi di tutte le tracce prima/dopo; confronto del rendering normalizzando solo le differenze attese di identità. Documentare gli errori già presenti separatamente dalle regressioni.
7. Aggiornare template, eventuale importatore e strumenti generici perché non generino nuovi ID nel front matter. Nessun doppio sistema ID/percorso a regime.

Per rinomina da Explorer: mappa vecchi/nuovi URI, scansione delle sole verifiche, modifica semantica dei riferimenti dentro l'operazione nativa. Verificare cartelle, documenti non salvati, collisioni e annullamento. Uno spostamento fuori dalla radice esercizi non ha un nuovo ID valido: segnalarlo esplicitamente, senza inventare riferimenti esterni. Cancellazioni e spostamenti esterni producono diagnostica dei riferimenti mancanti.

## 6. Fasi, consegne e criteri di completamento

### F0 — Preparazione dei due repository

- [x] Creare questo repository `verifiche-vscode` e inizializzare un nuovo Git autonomo; verificare prima che la directory non contenga lavoro esistente.
- [x] Aggiungere struttura TypeScript, manifest estensione, licenza e fixture sintetiche; definire versione minima VS Code sulle API stabili effettivamente utilizzate.
- [x] Configurare esecuzione nell'Extension Development Host e workspace di sviluppo con entrambi i repo. Le configurazioni pubbliche non devono richiedere il repo privato.
- [x] Separare istruzioni del software, piano pubblico generico e registro locale privato. Il diario e i report dei dati reali restano nel repository dati.

Completata quando l'estensione vuota si avvia su una cartella dati sintetica e codice/dati hanno storie Git separate. Non include pubblicazione remota.

### F1 — Prototipo del percorso quotidiano

- [x] File vuoto -> template -> inserisci esercizio esistente/nuovo -> apri esercizio: implementato; per la prova specifica della finestra nativa di creazione vedere il TODO.
- [x] Modifica testo -> anteprima varianti -> torna alla verifica -> seleziona variante -> anteprima verifica.
- [x] Provare subito drop esercizi, drop immagini e incolla immagini sulle API stabili.
- [x] Confrontare il flusso con il vecchio strumento XML: il 15 ottobre 2026 l’utilizzatore riferisce maggiore fluidità sotto tutti gli aspetti considerati dopo numerose verifiche reali. Esito qualitativo; nessuna misura temporale o conteggio delle interazioni aggiuntivo disponibile.

Completata quando il flusso reale è provabile dall'utente senza shell per le operazioni ordinarie. Non rimandare la verifica delle interazioni più incerte al termine dello sviluppo.

### F2 — Motore documentale e risoluzione su richiesta

- [x] Estrarre parsing, validazione e rendering; separare accesso URI/documenti dal dominio.
- [x] Implementare intervalli sorgente, modifiche minime, cache limitata e snapshot dei buffer aperti.
- [x] Gestire file incompleti, liste/mappe vuote e diagnostica locale; le azioni strutturali richiedono un contesto YAML analizzabile, il salvataggio resta sempre nativo.
- [x] Testare commenti, rientri, CRLF, gruppi annidati, forme alternative e buffer sporchi.
- [x] Aggiornamenti circoscritti alle dipendenze di anteprima e diagnostica attive,
  senza grafo globale; verificati anche file mancanti e buffer non salvati.

Completata quando le operazioni non riscrivono il resto del documento e gli errori estranei non bloccano il lavoro. F1 può anticipare una porzione minima di questa fase senza duplicarne il motore.

### F3 — Migrazione e gestione dei riferimenti

- [x] Implementare simulazione e applicazione della migrazione con report ed equivalenza.
- [x] Provare su copia e poi migrare i dati della cartella privata; conservare report e revisioni di partenza/arrivo nel diario locale. Non ripetere una migrazione già applicata.
- [x] Implementare navigazione, completamento, rinomina/spostamento file e cartelle e aggiornamento utilizzi. Rinomina file e undo provati nel vero Extension Host; gesto su cartella ancora da verificare nel collaudo pratico.

Completata quando tutti i riferimenti validi prima della migrazione si risolvono ai medesimi contenuti dopo, e la migrazione è ripetibile senza ulteriori modifiche.

### F4 — Comandi strutturali completi

- [x] Tracce: aggiunta, eliminazione, rinomina, duplicazione e mappe associate.
- [x] Blocchi: prima/dopo/dentro gruppi vuoti, inserimento file esistente/nuovo.
- [x] Varianti: selezione renderizzata, creazione, duplicazione, rinomina e utilizzi.
- [x] Drop esercizi e gestione assegnazioni sequenziali/pubblica/varianti non vuote: provider verificato con DataTransfer nel vero host; gesto di drop confermato dall’utilizzatore il 15 ottobre 2026.
- [x] Collaudo utente di annulla/ripristina e annullamento dei dialoghi recepito il 15 ottobre 2026; i casi specifici ancora senza prova sono elencati nel TODO.
- [ ] Completare posizione del cursore e scelta della cartella contestuale previste nelle sezioni 4.1–4.3; vedere TODO.

Completata quando sono coperti i flussi della sezione 4 senza pannelli gestionali duplicati rispetto a VS Code.

### F5 — Anteprima, immagini e stampa definitiva

- [x] Anteprima e selettore nello stesso pannello; corretta la duplicazione dell’editor. Resta il caso di passaggio a un documento estraneo durante la scelta, riportato nel TODO.
- [x] Incolla/drop immagini, allegati, formule, HTML e stili implementati; verificati DataTransfer, caricamento reale di immagini/formule e PDF. Drop e incolla dagli appunti confermati dall’utilizzatore il 15 ottobre 2026.
- [x] Export corrente/tutte con buffer non salvati, setup Chromium e output implementati. PDF testati con Chromium già presente.
- [ ] Completare la condivisione dello snapshot tra anteprima ed export, incluse le risorse; collaudare il primo download di Chromium. Dettagli nel TODO.
- [x] Misure di reattività alla scala di riferimento e 3×, senza caricamento globale all’avvio.
- [x] Aggiornamenti limitati alle dipendenze attive, compresi allegati, stile e
  selettore varianti; verificato l’isolamento tra radici workspace.
- [ ] Completare la cancellazione delle scansioni prevista dalla sezione 3; vedere TODO.

Completata quando la stampa corrisponde ai contenuti mostrati, le immagini funzionano offline e gli errori non producono PDF dichiarati validi.

### F6 — Consegna e separazione definitiva

- [x] Verifica manuale di una verifica completa con più tracce e gruppi; registrare confronto di efficienza e feedback.
- [x] Build, test di dominio e integrazione VS Code; test pubblici basati esclusivamente su fixture sintetiche.
- [x] Pacchetto VSIX installabile e documentazione di uso, aggiornamento, formato e CLI.
- [x] Ripulire dal repo dati il software ormai trasferito, aggiornare README/TODO; nessun lavoro di compatibilità web. Rimossi i sorgenti versionati e gli avvii; vecchi node_modules/build ignorati possono restare su disco.
- [x] Controllare contenuto del pacchetto e del repo pubblico: solo software e materiali pubblicabili, nessuna dipendenza dal checkout privato.
- [x] Repository [verifiche-vscode](https://github.com/fornaeffe/verifiche-vscode) pubblico GPL-3.0, come confermato dall’utilizzatore il 15 ottobre 2026. Nessun commit remoto attribuito senza verifica.

Completata quando il software funziona installato senza il suo checkout sorgente e il repo dati resta autonomo e privato.

## 7. Scelte consolidate e limiti di ambito

Le scelte del prototipo sono ora documentate nel [manuale d’uso](../README.md)
e nell’architettura:

- Drop tramite API native e scelta dentro/prima/dopo per i gruppi.
- CodeLens dedicati agli inserimenti nelle verifiche; operazioni sulle tracce e scelta variante nelle Code Actions contestuali. Scorciatoie nel [riferimento comandi](../riferimento/comandi-impostazioni.md).
- Template verifica con traccia pubblica e una ordinaria, titolo dal file.
- Su documento estraneo conservare l’ultima anteprima, identificata dal nome del file; resta da chiudere il selettore temporaneo in questo caso (TODO).
- Eliminazione manuale dell’ultima variante: bozza salvabile con diagnostica, senza assegnazioni o cancellazioni automatiche degli utilizzi.

La duplicazione/ricerca/organizzazione di file resta nativa. Duplicare tracce o varianti e aggiornare riferimenti sono operazioni semantiche del formato, quindi appartengono all'estensione. Riordinare i blocchi avviene nell'editor, non nell'Explorer: non confondere ordine dei file e ordine della verifica.

Non includere nella prima versione: server remoto, editor browser/tablet, database, sincronizzazione propria, collaborazione online, motore di ricerca proprietario, notebook/custom editor al posto del testo. La CLI deve permettere validazione/export e riuso del dominio; l'integrazione con uno specifico LLM non è prerequisito della nuova UX.

## 8. Collaborazione con una cartella dati separata

Per lo sviluppo bastano questo repository e le fixture sintetiche incluse. Se un
intervento richiede dati privati, si può usare un workspace VS Code multi-root con
il checkout del software e la cartella dati scelta dall’utilizzatore. Non è un
requisito dell’estensione installata e non unisce le storie Git.

Conservare configurazioni personali del workspace, diario operativo, revisioni dei
dati, report e screenshot reali nella cartella privata. Nelle configurazioni pubbliche
usare soltanto fixture sintetiche. Verificare separatamente percorsi e permessi
della sessione prima di intervenire sui dati.

Per riprendere il lavoro:

1. Leggere [AGENTS.md](../../AGENTS.md), README, architettura e la sola attività pertinente in TODO; consultare questo archivio per i contratti originari.
2. Controllare `git status`, branch e HEAD del repository coinvolto; non sovrascrivere modifiche preesistenti né assumere che una checkbox dimostri il comportamento del codice.
3. Se si lavora anche sui dati, leggere le istruzioni locali e il checkpoint più recente del diario privato, controllando separatamente lo stato Git. Non ripetere migrazioni già applicate.
4. Registrare gli esiti effettivi distinguendo implementazione, test automatici, collaudo utente e prove ancora aperte. Le revisioni dei due repo vanno annotate nel diario privato quando cambiano insieme codice e formato dati.

## 9. Consegna e verifica del piano — 15 ottobre 2026

- L’utilizzatore conferma drop esercizi, drop/incolla immagini, annullamento/ripristino
  e maggiore fluidità rispetto al vecchio strumento dopo numerose verifiche reali.
  Il confronto è qualitativo, senza nuovi tempi o conteggi delle interazioni.
- Pubblicazione pubblica GPL-3.0 confermata dall’utilizzatore. Il software locale è
  alla versione 0.1.3; la precedente installazione annotata non dimostra che la
  scorciatoia chimica sia già disponibile nel profilo ordinario.
- Piano, prompt e proposta sono archiviati qui, con percorsi generici e riferimenti
  relativi a questo repository. Inventari, revisioni dei dati e checkpoint operativi
  precedenti sono stati conservati nel diario privato, senza trasferirli nel pubblico.
- Il confronto documentale con i sorgenti ha individuato previsioni parziali nelle
  sezioni 3 e 4, oltre ai collaudi specifici ancora aperti: tutte riportate in
  [TODO.md](../../TODO.md), senza riaprire le prove già confermate dall’utilizzatore.
- Verificati collegamenti relativi, separazione dei documenti privati e diff Git.
  Nessun nuovo test software, pacchetto, installazione, commit o push in questa consegna.
  Per il prossimo intervento scegliere un’attività nel TODO; non ripartire da F0.
- Consegna settings, 15 ottobre 2026: implementate le cinque opzioni descritte nel
  [riferimento delle impostazioni](../riferimento/comandi-impostazioni.md#impostazioni), con validazione per
  operazione e ambito per risorsa; anche `contentDirectory` supporta valori distinti
  per cartella. Superati 21 test di dominio, build ed Extension Host su VS Code
  1.100.0: template, impostazioni aggiornate senza riavvio, due cartelle workspace,
  contenuti annidati, configurazioni invalide ed export corrente/tutti in PDF reali
  su percorsi relativi e assoluti. Il collaudo della finestra nativa resta nel TODO.
  Nessun nuovo VSIX, installazione nel profilo ordinario, commit o push.
- Consegna dipendenze attive, 15 ottobre 2026: eventi dei buffer e del filesystem
  filtrati sui riferimenti correnti di anteprima/selettore e diagnostica visibile,
  registrati anche prima delle letture fallite. Superati 24 test di dominio, build
  ed Extension Host su VS Code 1.100.0 con fixture sintetiche: assenza di refresh
  estranei, buffer non salvati, due radici, recupero di file/allegati mancanti,
  creazione/cancellazione dello stile, sostituzione dei riferimenti e pannello chiuso.
  Restano aperte le altre attività del TODO. Nessun nuovo VSIX, installazione nel
  profilo ordinario, commit o push.

- Consegna setup dati, 15 ottobre 2026 (0.1.4): implementato il comando descritto
  nella sezione 2, con Git facoltativo e CSS incluso come unica sorgente del modello.
  Rimossi selettori e classi dei precedenti strumenti; conservati gli accorgimenti
  di spaziatura delle opzioni SM. Schede esercizio/selettore con classe del tipo;
  l'export riceve il CSS della radice workspace anche con contenuti annidati.
  Superati 29 test di dominio, build ed Extension Host VS Code 1.100.0; Chromium
  verifica i cinque tipi, immagini/formule, risposte lunghe e stampa. Esportati PDF
  sintetici: due pagine A4, stesso testo dell'anteprima stampata, stile della radice
  corretto e ispezione visiva riuscita. Creato il VSIX 0.1.4 e ripetuta l'intera suite
  sul pacchetto estratto, inclusi setup e risorse dell'installazione. Restano il collaudo
  dei dialoghi nativi e l'installazione nel profilo ordinario, indicati nel TODO.
  Nessuna modifica ai dati privati, commit o push.

- Consegna documentazione, 15 ottobre 2026: [manuale d’uso](../README.md) con
  tutorial, guide, riferimento, problemi, agenti sui contenuti ed esempi sintetici;
  comando **Apri guida** dall’installazione e richiamo nel README del setup.
  Supporto GitHub Discussions/Issues. La documentazione per sviluppo, CLI e
  distribuzione rimane solo nel repository, indicizzata da
  [CONTRIBUTING](../../CONTRIBUTING.md). Superati controllo riferimenti/case,
  31 test, build ed Extension Host Windows VS Code 1.100.0, anche sul VSIX estratto;
  verificata l’esclusione dei documenti di sviluppo. Esportati i due PDF degli
  esempi, ciascuno da 10 punti. Pacchetto di prova prodotto mantenendo 0.1.4 e
  changelog «Non rilasciato»: nessuna nuova pubblicazione, installazione nel profilo
  ordinario, modifica ai dati privati, commit o push. Collaudi precedenti aperti nel TODO.

## 10. Riferimenti tecnici verificati nella valutazione

- [Funzionalità linguistiche VS Code](https://code.visualstudio.com/api/language-extensions/programmatic-language-features): CodeLens, azioni, diagnostica, navigazione.
- [API VS Code](https://code.visualstudio.com/api/references/vscode-api): modifiche documentali, eventi di rinomina, drop/paste e selettori.
- [Webview](https://code.visualstudio.com/api/extension-guides/webview): pannello laterale, risorse locali e isolamento dei contenuti.

Prima di fissare la versione minima dell'estensione verificare nuovamente disponibilità e comportamento delle API necessarie nella versione target; usare API stabili.
