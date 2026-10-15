# Prompt originario — archivio

Documento storico della richiesta iniziale per il precedente strumento locale.
I percorsi sono esempi generici; per l’estensione realizzata prevale
[PIANO-VSCODE.md](PIANO-VSCODE.md), per il lavoro corrente [TODO.md](../../TODO.md).

Per preparare le verifiche usavo una serie di file xml che trovi nella cartella sorgente `archivio-xml/`



Ciascun file xml è relativo ad una verifica di un particolare anno di un particolare indirizzo (scienze applicate o tradizionale).

In ogni file xml era descritta la struttura della verifica, costituita da un titolo e da blocchi che potevano essere istruzioni o esercizi, questi ultimi di diversi tipi:

- risposta aperta (A)
- scelta multipla (SM)
- vero/falso (VF)
- assegnazione di etichette (Etichettare)
- completamento (Completamento)

Il contenuto di ciascun esercizio poteva avere diverse varianti, ciascuna associata ad una delle possibili tracce della verifica: le parti della verifica indicate dal parametro t="..." venivano mostrate solo nelle tracce comprese nel parametro t. Ad esempio, \<img t="1" ... /> veniva mostrata solo nella traccia 1, \<PT t="2 3"> \</PT> è una parte che veniva mostrata solo nella traccia 2 e nella traccia 3, e così via. Per indicare che una parte doveva essere mostrata in tutte le tracce tranne alcune, usavo un meno davanti al numero di traccia: t="-1" significa mostra sempre tranne che nella traccia 1.

Nota che in tutte le verifiche la traccia 0 è la traccia di prova, che viene resa pubblica agli studenti prima della verifica.

A ciascun esercizio o gruppo di esercizi veniva assegnato un punteggio, che veniva rappresentato sulla verifica stampata come una casella compilabile da docente (es. punti .../2)

Per stampare le verifiche lancio un server locale via VSCode, apro il file index.html con due parametri URL: v= che indica la verifica desiderata, t= che indica la traccia desiderata, e il file index.html tramite uno script prende l'xml della verifica desiderata, lo trasforma attraverso due passaggi descritti dai due file .xsl e lo mostra, nascondendo o mostrando le parti a seconda della traccia desiderata. Dopodiché stampo la pagina mostrata su un file PDF, e poi stampo il PDF nel numero di copie cartacee che mi servono.

Questo sistema è più efficiente rispetto a scrivere ogni traccia di verifica singolarmente su Word, con i relativi problemi di formato nel copia/incolla e la necessità di mantenere coerenti le tracce tra loro in caso di modifica.

Penso però che questo sistema sia ottimizzabile: il passaggio accensione server -> digitazione di verifica e traccia nell'url mi sembra un po' macchinoso, così come è un po' macchinoso digitare manualmente il codice xml.\
&#x20;Inoltre uno stesso esercizio potrebbe essere presente su verifiche diverse, e in questo caso devo scriverlo in entrambi i file xml, così che se voglio modificarlo devo ricordarmi di farlo in tutte le verifiche.



Vorrei sviluppare, uno strumento migliore, separato dalla cartella dei dati personali.

Ti chiedo di scrivere in un nuovo file .md la tua proposta su come dovrebbe essere strutturato questo nuovo strumento di gestione delle verifiche.

Dovrebbe avere queste caratteristiche:

- possibilità di importare nel nuovo strumento gli esercizi e le verifiche già presenti nella cartella sorgente `archivio-xml/`
- una collezione di esercizi, ciascuno dei quali deve poter avere più varianti (quelle che attualmente sono le diverse tracce, anche se "traccia" dovrà diventare un concetto legato alla verifica e non all'esercizio)
- il testo di ogni esercizio deve poter essere formattato (non in modalità WYSIWYG, meglio scrivendo codice markdown, html o simile), e devo potervi inserire immagini, formule matematiche, formule chimiche...
- una collezione di verifiche, ciascuna delle quali composta da un titolo e più blocchi che possono essere istruzioni (specifiche per la verifica) o esercizi (presi dalla relativa collezione).
- per ciascuna verifica dovrei poter attribuire un punteggio ad un esercizio o ad un gruppo di esercizi, punteggio che verrà reso come una casella compilabile dal docente nella stampa.
- per ciascuna verifica dovrei poter assegnare ad ogni traccia della verifica una versione di ogni esercizio della verifica (più tracce possono condividere la stessa versione dell'esercizio)
- dovrei poter decidere che aspetto dovrebbero avere le verifiche; anche un foglio di stile come quello nella versione attuale potrebbe andare bene
- devo poter facilmente e rapidamente stampare una particolare traccia di una particolare verifica in un file PDF
- devo poter accedere ai miei dati da posizioni diverse: non necessariamente avere accesso all'eventuale UI e alla renderizzazione delle verifiche (anche se sarebbe un utile bonus), ma almeno al codice degli esercizi, per poter fare correzioni al volo anche da remoto. Attualmente uso una copia della cartella archivio-xml/ messa su OneDrive, ma anche GitHub potrebbe funzionare.
- è **fondamentale** che questo nuovo strumento renda più efficiente e più rapido il mio flusso di lavoro: se creare un nuovo esercizio diventasse più macchinoso di digitare, ad esempio, \<A punti="1">\<PT t="0">Testo della prima versione\</PT>\<PT t="1">Testo della seconda versione\</PT>\</A>, allora sarebbe un passo indietro, non un passo avanti. Questo criterio è senza dubbio più importante dell'avere una UI moderna e piena di funzioni. Se per rispettare questo criterio occorresse non allontanarci molto dalla versione attuale, possiamo anche fare uno strumento simile alla versione attuale, non per forza qualcosa di completamente diverso.
- lo strumento dovrà funzionare sicuramente sul mio PC attuale, senza bisogno di hosting esterni; la possibilità di usarlo da altri PC è un bonus interessante ma non necessario o urgente (fermo restando la possibilità di accedere ai dati da remoto)



Ti chiedo quindi di:

- ispezionare la versione precedente (cartella sorgente `archivio-xml/`)
- eventualmente chiedermi chiarimenti se occorrono
- scrivere il file .md con la proposta del nuovo strumento, questo file ci servirà come guida nella sua implementazione
