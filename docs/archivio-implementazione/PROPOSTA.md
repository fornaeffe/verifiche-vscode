# Proposta per il nuovo strumento di gestione delle verifiche

> Archivio della proposta iniziale per la precedente applicazione web locale,
> superata da [PIANO-VSCODE.md](PIANO-VSCODE.md) per l’estensione VS Code.
> Architettura web, ID espliciti, matrice e struttura mista codice/dati descritti
> sotto non sono il contratto corrente. Percorsi e nomi degli esempi sono generici;
> inventario e risultati dell’audit reale restano nel repository privato.

## 1. Obiettivo e scelta di fondo

Il nuovo strumento dovrebbe conservare il principale pregio del sistema attuale: il contenuto si scrive rapidamente come testo strutturato e la stampa viene prodotta automaticamente. Dovrebbe invece eliminare tre limiti:

1. gli esercizi sono incorporati nelle singole verifiche e quindi vengono duplicati;
2. il concetto di variante dell'esercizio è mescolato con il numero della traccia tramite `t="..."`;
3. avvio, scelta della verifica, scelta della traccia e stampa richiedono passaggi manuali non necessari.

La proposta è una **applicazione locale, file-first e local-first**:

- gli esercizi sono file Markdown indipendenti e riutilizzabili;
- le verifiche sono piccoli file YAML che fanno riferimento agli esercizi;
- immagini e altri allegati sono conservati una sola volta in una cartella condivisa;
- una applicazione web locale consente di cercare, modificare, comporre, vedere l'anteprima e produrre PDF;
- una riga di comando offre scorciatoie per chi vuole lavorare ancora più rapidamente;
- i file di contenuto restano leggibili e modificabili direttamente con VS Code o dall'editor web di un repository GitHub privato.

Non propongo un database come fonte primaria. Un database renderebbe più difficili la modifica rapida da remoto, il confronto tra revisioni, il backup e il recupero manuale dei dati. L'applicazione potrà costruire all'avvio un indice in memoria per la ricerca, ma la fonte autorevole resteranno i file.

## 2. Che cosa è stato rilevato in `archivio-xml/`

L’ispezione dell’archivio XML originario ha individuato queste caratteristiche
rilevanti per il progetto; conteggi e risultati puntuali restano nel diario privato:

- i cinque tipi di esercizio A, SM, VF, Etichettare e Completamento;
- selettori di traccia su contenitori, immagini ed elementi di elenco, anche annidati;
- punteggi di esercizio e gruppo, interi o decimali con la virgola;
- HTML incorporato, classi, stili, formule storiche, immagini raster e SVG;
- interruzioni di pagina e contenitori di domande escluse dalla stampa;
- allegati identici e strutture duplicate, insieme a riusi simili da non unire automaticamente;
- numero variabile di tracce e traccia di prova pubblica non dichiarata formalmente.

Il supporto ai selettori negativi va valutato sull’archivio sorgente, senza assumere
che ogni installazione riproduca le caratteristiche dell’archivio iniziale.

L'attuale catena XML → XSLT → XSLT → HTML è ingegnosa e compatta, ma lo schema XSD descrive solo parzialmente il formato realmente usato. Il nuovo formato dovrà essere validato sul comportamento effettivo dei file, non soltanto sullo schema.

## 3. Esperienza d'uso desiderata

### Avvio quotidiano

Un doppio clic su `avvia.cmd` dovrebbe:

1. avviare in background il piccolo server locale, se non è già attivo;
2. aprire automaticamente la pagina iniziale nel browser;
3. mostrare subito l'elenco delle verifiche e degli esercizi.

Non dovrà essere necessario avviare manualmente Live Server né comporre un URL con parametri.

In una fase successiva si potrà impacchettare tutto in un eseguibile Windows, ma non è necessario per la prima versione: sul PC attuale sono già disponibili Node.js, npm, Git e VS Code.

### Creare un esercizio

Dalla pagina “Esercizi”:

1. premere “Nuovo esercizio”;
2. scegliere il tipo;
3. assegnare un nome breve o lasciare che venga proposto dal titolo;
4. scrivere il contenuto in Markdown;
5. aggiungere varianti duplicando quella corrente o creandone una vuota;
6. salvare con `Ctrl+S`.

L'editor deve essere testuale, con evidenziazione della sintassi e anteprima affiancata, non WYSIWYG. Dovrà essere possibile trascinare o incollare un'immagine: l'app la copierà negli allegati e inserirà automaticamente la sintassi nel testo.

Lo stesso esercizio potrà anche essere creato direttamente aggiungendo un file `.md` in VS Code. Il formato compatto proposto è mostrato nella sezione 5.

### Comporre una verifica

Dalla pagina “Verifiche”:

1. creare la verifica e le sue tracce;
2. aggiungere istruzioni specifiche;
3. cercare gli esercizi per testo, tipo, materia, argomento o tag e aggiungerli;
4. trascinarli per riordinarli;
5. attribuire il punteggio al singolo esercizio o al gruppo;
6. assegnare le varianti attraverso una matrice con tracce sulle colonne ed esercizi sulle righe.

La matrice deve evidenziare immediatamente:

- tracce senza variante risolta;
- varianti inesistenti;
- esercizi ripetuti per errore;
- punteggio totale di ciascuna traccia;
- eventuali differenze di punteggio fra tracce.

### Stampare

Dalla verifica si sceglie una traccia e si preme “Genera PDF”. Il file viene creato direttamente, per esempio in:

`output/esempio/traccia-2.pdf`

Deve esserci anche “Genera tutti i PDF”. La finestra di stampa del browser resta disponibile come alternativa, ma non è il flusso principale.

Per l'uso da tastiera sarà disponibile un comando equivalente, per esempio:

```text
npm run pdf -- esempio 2
```

## 4. Modello concettuale

### Esercizio

Un esercizio ha:

- un identificatore stabile e univoco;
- un tipo: `A`, `SM`, `VF`, `Etichettare` o `Completamento`;
- metadati facoltativi per ricerca e organizzazione: titolo interno, materia, anno consigliato, indirizzo, argomenti e tag;
- una o più **varianti con un nome proprio**, indipendente da qualunque verifica;
- eventuali allegati condivisi.

Il punteggio non appartiene all'esercizio: lo stesso esercizio può valere quantità diverse in verifiche diverse.

Una variante è completa. Al suo interno non esistono tracce e non si usa `t`. Questo rende possibile riutilizzare l'esercizio in qualsiasi verifica.

### Verifica

Una verifica ha:

- identificatore e titolo;
- metadati facoltativi, come anno, indirizzo e argomenti;
- un elenco esplicito di tracce;
- una traccia marcata come `pubblica`, normalmente quella importata dalla vecchia traccia `0`;
- una sequenza ordinata di blocchi.

I blocchi principali sono:

- istruzione specifica della verifica;
- esercizio referenziato dalla collezione;
- gruppo di esercizi con istruzione e punteggio comuni.

Come direttiva di impaginazione è inoltre ammessa un'interruzione di pagina. Non è contenuto didattico e viene tenuta distinta dai tre blocchi principali.

Ogni uso di un esercizio contiene la mappa fra tracce della verifica e varianti dell'esercizio. Più tracce possono risolvere alla stessa variante.

### Stile di stampa

La struttura semantica e l'aspetto restano separati. Un profilo di stampa contiene:

- CSS;
- formato e margini della pagina;
- intestazione con nome, classe e data;
- formato del titolo;
- aspetto delle caselle punti;
- regole per evitare spezzature indesiderate;
- stile specifico dei diversi tipi di esercizio.

Il CSS attuale sarà il punto di partenza del profilo predefinito, così la prima migrazione non cambierà inutilmente l'aspetto delle verifiche.

## 5. Formato proposto per gli esercizi

Ogni esercizio è un file Markdown. Esempio `contenuti/esercizi/esempi/colori.md`:

```markdown
---
id: esempio-colori
tipo: SM
titolo: Esempio sintetico di scelta multipla
argomenti: [esempio]
---

:::variante base
Quale parola indica un colore?

- Rosso
- Tavolo
- Fiume
- Quaderno
:::

:::variante alternativa
Quale parola indica un oggetto?

- Verde
- Libro
- Blu
- Giallo
:::
```

Per un esercizio nuovo con una sola variante bastano il tipo, un delimitatore e il testo:

```markdown
---
tipo: A
---

:::variante base
Descrivi un oggetto di uso quotidiano.
:::
```

Il nome file può essere usato per generare automaticamente l'`id`; l'app lo scriverà esplicitamente quando serve stabilizzarlo. Il campo `titolo` è solo un aiuto per la ricerca e non viene stampato, salvo richiesta esplicita.

### Sintassi del contenuto

Si adotta Markdown per i casi comuni e si consente HTML nei casi di impaginazione avanzata già presenti nei file XML.

```markdown
Testo in **grassetto** e *corsivo*.

Formula matematica in linea: $v = k[A]^2$

$$
\Delta G = \Delta H - T\Delta S
$$

Formula o reazione chimica: $\ce{2H2 + O2 -> 2H2O}$

![Schema del DNA](../allegati/dna.png){width=70mm float=right}
```

Le formule saranno rese con KaTeX e la sua estensione `mhchem`, prevista specificamente per equazioni chimiche. Pedici e apici HTML importati, come `H<sub>2</sub>O`, continueranno a funzionare, perciò non sarà necessario riscrivere subito tutto il materiale storico.

Per `SM`, `VF` ed `Etichettare`, il primo elenco puntato al livello principale contiene rispettivamente le opzioni o le affermazioni. Questa regola consente una scrittura molto più breve dell'XML. L'app valida il contenuto e segnala, per esempio, una scelta multipla senza opzioni.

Il Markdown importato è considerato contenuto fidato del repository personale. L'HTML libero non deve invece essere accettato da fonti esterne senza filtraggio.

## 6. Formato proposto per le verifiche

Le verifiche sono YAML perché contengono soprattutto riferimenti, ordine e configurazione, non lunghi testi. Esempio `contenuti/verifiche/esempio.yaml`:

```yaml
titolo: Esempio sintetico
anno: 3
indirizzo: scienze-applicate

tracce:
  - id: prova
    etichetta: Traccia di esempio
    pubblica: true
  - id: "1"
    etichetta: Traccia 1
  - id: "2"
    etichetta: Traccia 2

blocchi:
  - gruppo:
      istruzioni: Segna il completamento corretto.
      punti: 2
      esercizi:
        - esercizio: esempio-colori
          versioni:
            default: base
            "1": alternativa
            "2": base

        - esercizio: esempio-oggetti
          versioni:
            default: oggetti
            "2": colori

  - istruzioni:
      testo: >-
        Rispondi sul foglio, giustificando le risposte.

  - esercizio:
      id: esempio-descrizione
      punti: 2
      versioni:
        default: breve
        prova: guidata

  - salto_pagina: true
```

L'identificatore della verifica deriva dal percorso del file relativo a `contenuti/verifiche`, senza l'estensione YAML; non è duplicato nel documento.

`default` si applica a tutte le tracce non elencate. Nell'esempio, per `esempio-oggetti` le tracce `prova` e `1` usano `oggetti`, mentre la traccia `2` usa `colori`. La UI mostrerà comunque la matrice completa già risolta, quindi l'abbreviazione non nasconde assegnazioni ambigue.

Se un'istruzione storica cambia fra tracce, il blocco istruzione può usare la stessa forma `versioni` con piccoli testi Markdown locali. Questa possibilità serve soprattutto all'importazione; per le nuove verifiche è preferibile mantenere istruzioni comuni.

I punti sono numeri YAML, quindi i vecchi `1,5` verranno convertiti in `1.5`; in anteprima e in stampa saranno formattati secondo la notazione italiana.

## 7. Architettura tecnica

### Componenti

La prima versione dovrebbe usare:

- **Node.js e TypeScript** per server locale, validazione, importazione e comandi;
- una UI web leggera, senza dipendere da un framework complesso se non si rivela necessario;
- **CodeMirror** come editor testuale nel browser;
- **markdown-it** per Markdown con estensioni controllate e HTML abilitato;
- **KaTeX + mhchem** per matematica e chimica;
- **Playwright/Chromium** per produrre PDF A4 applicando il CSS di stampa;
- YAML per i manifest delle verifiche;
- test automatici per parser, risoluzione delle varianti, punteggi e importatore.

La documentazione ufficiale conferma che [markdown-it è estendibile e può supportare HTML esplicito](https://github.com/markdown-it/markdown-it), che [KaTeX include l'estensione mhchem](https://katex.org/docs/libs) e che [`page.pdf()` di Playwright usa i CSS di stampa e supporta dimensioni e margini in millimetri](https://playwright.dev/docs/api/class-page#page-pdf).

### Un solo motore di rendering

Anteprima browser e PDF devono usare la stessa funzione:

```text
file della verifica
    → validazione
    → risoluzione traccia → variante
    → caricamento Markdown dell'esercizio
    → Markdown/formule → HTML semantico
    → profilo CSS di stampa
    → anteprima oppure PDF
```

Questo evita divergenze fra ciò che si vede e ciò che si stampa. Il renderer non deve dipendere dallo stato dell'editor e deve poter essere chiamato sia dall'interfaccia sia dalla riga di comando.

### API locale minima

Il server espone soltanto su `127.0.0.1` operazioni per:

- elencare, leggere e salvare esercizi e verifiche;
- indicizzare e cercare gli esercizi;
- importare immagini;
- validare una verifica;
- renderizzare una traccia;
- generare uno o tutti i PDF.

I percorsi ricevuti dall'interfaccia devono essere risolti e controllati per impedire scritture fuori dalle cartelle previste.

## 8. Struttura prevista del repository

```text
progetto-originario/        # struttura storica, precedente alla separazione
├─ contenuti/
│  ├─ esercizi/
│  │  ├─ chimica/
│  │  ├─ biologia/
│  │  └─ scienze-della-terra/
│  ├─ verifiche/
│  └─ allegati/
├─ stili/
│  └─ predefinito.css
├─ app/
│  ├─ server/
│  ├─ ui/
│  ├─ rendering/
│  └─ importazione/
├─ output/                 # ignorata da Git
├─ report-importazione/    # report, confronti e casi da rivedere
├─ test/
├─ avvia.cmd
├─ installa.cmd
├─ package.json
└─ README.md
```

Le sottocartelle degli esercizi servono solo all'ordine umano; i riferimenti usano l'`id` stabile e non il percorso, perciò un file può essere spostato senza rompere le verifiche.

Gli allegati importati ricevono nomi leggibili con un breve suffisso derivato dall'hash in caso di collisione. File identici vengono memorizzati una sola volta. Non si devono sovrascrivere due immagini diverse che per caso hanno lo stesso nome.

## 9. Importazione da `archivio-xml/`

L'importazione deve essere un comando ripetibile e non distruttivo. Non modifica la cartella precedente e scrive inizialmente in una cartella di staging.

### Procedura

1. Leggere ogni XML come DOM, conservando l'origine di ogni elemento.
2. Determinare le tracce presenti nella verifica. Lo `0` viene convertito nell'id `prova` con `pubblica: true`; gli altri numeri restano disponibili come id.
3. Per ogni occorrenza di esercizio e per ogni traccia, applicare esattamente le regole di visibilità di `t` a **qualsiasi discendente**, comprese immagini e `li`.
4. Non occorre supportare anche `t` negativo se non è mai usato nelle verifiche attuali. In caso contrario, occorre cercare di ricondurlo al sistema di varianti adottato.
5. Produrre una variante completa per ogni risultato distinto. Tracce che producono lo stesso contenuto vengono mappate alla stessa variante.
6. Convertire in Markdown le strutture semplici; conservare come HTML valido le strutture per le quali la conversione farebbe perdere stile o disposizione.
7. Trasferire le immagini negli allegati condivisi, deduplicandole per contenuto e riscrivendo i riferimenti.
8. Trasformare i `punti` dei singoli esercizi in punteggi dell'uso nella verifica.
9. Trasformare un'`Istruzioni punti="..."` e gli esercizi che introduce in un gruppo con punteggio comune. Poiché il vecchio XML non dichiara formalmente il confine del gruppo, l'importatore usa la successiva istruzione come confine e registra il risultato tra i casi da controllare.
10. Conservare le istruzioni senza punteggio come blocchi della verifica e i `PageBreak` come direttive di impaginazione.
11. Importare gli esercizi dentro `AltreDomande` nella collezione, marcandoli come non usati nella verifica, perché oggi quel contenitore è escluso dalla stampa.
12. Conservare i commenti XML rilevanti come note di migrazione, senza stamparli.

### Deduplicazione prudente

La deduplicazione deve avvenire in due livelli:

- **automatica** soltanto per allegati identici e per esercizi con struttura normalizzata esattamente identica;
- **assistita** per esercizi simili, mostrando differenze affiancate e chiedendo se unirli, mantenerli separati o trasformarli in varianti dello stesso esercizio.

Non bisogna unire automaticamente esercizi solo perché condividono una o più varianti: potrebbero avere finalità o punteggi concettualmente diversi. Quando due esercizi vengono uniti, tutti i riferimenti delle verifiche devono essere aggiornati in un'unica operazione.

### Verifica della migrazione

Per ogni verifica e traccia importata il comando deve produrre:

- esito della validazione;
- numero e ordine degli esercizi;
- punteggi e totale;
- elenco degli allegati mancanti;
- avvisi su costrutti convertiti in HTML;
- confronto visivo o screenshot affiancabile fra vecchio e nuovo rendering;
- elenco dei casi che richiedono revisione manuale.

La migrazione si considera riuscita solo dopo un controllo a campione di verifiche semplici e complesse e dopo aver risolto tutti gli errori, non necessariamente tutti gli avvisi.

## 10. Validazione e sicurezza contro errori di stampa

Prima dell'anteprima definitiva o del PDF, lo strumento deve bloccare la generazione se trova:

- id duplicati;
- esercizi referenziati ma inesistenti;
- tracce senza variante risolta;
- nomi di variante inesistenti;
- allegati mancanti;
- Markdown o formule non renderizzabili;
- punteggi non numerici o negativi.

Deve invece mostrare avvisi non bloccanti per:

- totali diversi fra tracce;
- esercizi molto simili già presenti nella collezione;
- HTML o stili in linea che potrebbero rendere male in stampa;
- contenuto più lungo o più corto del normale rispetto alle altre tracce.

Il PDF deve riportare chiaramente l'id/etichetta della traccia, tranne quando un profilo di stampa decide esplicitamente di ometterlo. Per la traccia pubblica deve comparire “Traccia di esempio”.

## 11. Accesso remoto, backup e sincronizzazione

La soluzione consigliata è un **repository GitHub privato**:

- Markdown e YAML si possono correggere direttamente dal browser;
- Git conserva la cronologia e permette di annullare modifiche;
- su un altro PC basta clonare il repository;
- immagini e stili restano insieme ai contenuti.

È opportuno mantenere privato il repository, perché contiene anche le tracce non pubbliche. Un'eventuale pubblicazione della sola traccia di prova dovrà esportare file selezionati in una destinazione separata, senza rendere pubblico l'intero repository.

La UI remota e la generazione PDF su altri computer sono bonus successivi: i dati restano comunque accessibili da subito via GitHub.

## 12. Priorità di implementazione

### Fase 1 — Fondamenta e rendering

- definire e validare formalmente i due formati;
- implementare caricamento esercizi/verifiche e risoluzione delle varianti;
- rendere tutti i tipi di esercizio;
- integrare Markdown, HTML, KaTeX e mhchem;
- portare il CSS attuale;
- generare PDF da riga di comando;
- aggiungere test su fixture sintetiche rappresentative dei costrutti dell’archivio XML.

Questa fase produce già uno strumento utilizzabile da VS Code, anche senza UI completa.

### Fase 2 — Importatore

- importare XML, punteggi, tracce, immagini e interruzioni di pagina;
- deduplicare gli allegati;
- generare report e confronti;
- importare prima un gruppo pilota di verifiche, poi l'intero archivio;
- revisionare manualmente i casi ambigui.

### Fase 3 — UI essenziale

- dashboard senza parametri URL manuali;
- elenco e ricerca esercizi;
- editor testuale con anteprima e salvataggio;
- compositore della verifica;
- matrice tracce/varianti;
- anteprima e pulsanti PDF;
- trascinamento/incolla immagini;
- `avvia.cmd` e installazione guidata.

### Fase 4 — Miglioramenti

- confronto e fusione assistita degli esercizi simili;
- profili di stile multipli;
- comandi Git semplificati nella UI, senza nascondere ciò che fanno;
- esportazione sicura della sola traccia pubblica;
- pacchetto Windows autonomo;
- eventuale accesso alla UI dalla rete locale, disattivato per impostazione predefinita.

## 13. Criteri di accettazione

La prima versione completa è accettabile se:

1. tutte le verifiche XML dell’archivio sorgente vengono importate senza perdita silenziosa di contenuto;
2. ogni traccia importata risolve esattamente una variante per ogni esercizio usato;
3. immagini, formule, pedici, apici, elenchi e impaginazioni speciali risultano leggibili;
4. i punteggi di esercizi e gruppi sono mostrati e totalizzati correttamente;
5. si crea un esercizio semplice in meno tempo o con meno digitazione rispetto all'equivalente XML;
6. lo stesso esercizio può essere inserito in più verifiche e una sua modifica si riflette in tutte;
7. una verifica e una traccia si selezionano da un elenco, senza digitare URL;
8. un PDF di una traccia si genera con un solo comando o un solo pulsante dopo la selezione;
9. il sistema funziona offline sul PC attuale;
10. i contenuti restano comprensibili e modificabili anche senza avviare l'applicazione;
11. Git mostra differenze leggibili e permette di recuperare versioni precedenti;
12. nessun caso ambiguo dell'importazione viene risolto automaticamente senza essere registrato nel report.

## 15. Decisione raccomandata

La scelta raccomandata è quindi un'evoluzione controllata del sistema attuale, non una sua sostituzione con un gestionale pesante:

- Markdown compatto al posto dell'XML per il testo degli esercizi;
- YAML per comporre verifiche e tracce;
- riferimenti stabili per riusare gli esercizi;
- CSS ancora sotto il controllo del docente;
- applicazione locale come acceleratore, non come unico modo per accedere ai dati;
- PDF automatico e riproducibile;
- GitHub privato per accesso remoto e cronologia;
- migrazione conservativa con confronto e revisione esplicita.

Questa struttura risolve la duplicazione e rende più rapido il percorso dall'idea alla stampa, senza sacrificare la libertà e la velocità della scrittura diretta che rendono utile il sistema esistente.
