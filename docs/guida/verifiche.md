# Comporre verifiche

[Indice del manuale](../README.md) · [Sintassi completa](../riferimento/formato-verifiche.md)

## Blocchi e organizzazione

Crea un file `.yaml` o `.yml` in `contenuti/verifiche`, anche in sottocartelle.
Nel documento vuoto scegli **Inserisci template verifica**.
I CodeLens permettono di inserire prima o dopo un blocco, oppure dentro un gruppo;
sono disponibili anche il menu contestuale e **Verifiche: Inserisci blocco**.
La scorciatoia è `Ctrl+Alt+Insert` (`Cmd+Alt+Insert` su macOS).

| Blocco       | Uso                                                                       |
| ------------ | ------------------------------------------------------------------------- |
| Esercizio    | Riferimento a un file esercizio, con varianti assegnate alle tracce       |
| Gruppo       | Istruzioni comuni, eventuale punteggio e lista di blocchi, anche annidati |
| Istruzioni   | Consegna, anche diversa per traccia, con eventuale punteggio              |
| Contenuto    | Testo libero, anche diverso per traccia, senza numerazione dell’esercizio |
| Salto pagina | Interruzione per la stampa                                                |

Per riordinare usa il testo YAML, mantenendo l’indentazione. La numerazione degli
esercizi è continua anche attraverso i gruppi. Le modifiche dei comandi strutturali
si annullano con il normale Undo di VS Code.

Per consentire il riordino casuale dei figli di un gruppo aggiungi
[`ordine_casuale: true`](../riferimento/formato-verifiche.md#gruppi-riordinabili-casualmente)
dentro `gruppo`. Scegli se attivarlo quando esporti il PDF; usa sottogruppi per
tenere unite consegne ed esercizi.

Per inserire un esercizio scegli un file esistente o **Nuovo esercizio…**;
nel secondo caso seleziona nome e cartella nella finestra di salvataggio, all’interno
degli esercizi della verifica. Puoi anche trascinare un file esercizio nella verifica:
usa il gesto nativo di VS Code e, se necessario, l’azione **Inserisci esercizio nella verifica**.
Il drop si basa sulla posizione del cursore; dentro un gruppo permette di scegliere il confine.

## Assegnare le varianti

Un esercizio esistente riceve le varianti non vuote nell’ordine del file: prima
la traccia pubblica, poi le altre nell’ordine dichiarato. Non c’è riciclo se le
tracce sono più numerose. Un esercizio creato durante l’inserimento resta senza assegnazioni.

Per assegnare manualmente metti il cursore nella mappa `versioni`, sulla riga
della traccia, e apri la lampadina **Scegli variante per la traccia …**.
Scegli una scheda o **Nessuna assegnazione**. Annulla con il pulsante o Esc.
Puoi anche modificare il valore nel testo e richiamare il completamento di VS Code.

`default` è il ripiego per una traccia senza assegnazione esplicita;
`''` omette esercizio e punti. Un riferimento non risolto è un errore.
Per esempi e casi limite consulta [Assegnazioni](../riferimento/formato-verifiche.md#assegnazioni).

## Aggiungere, duplicare e rinominare tracce

**Aggiungi traccia** usa il primo ID numerico libero e assegna a ogni esercizio
la prima variante non vuota ancora libera nella verifica. Contano tutti gli usi,
anche nella pubblica e attraverso `default`; un default coperto da assegnazioni
esplicite non occupa la variante. Per esercizi ripetuti e gruppi annidati conta
l’ordine dei blocchi. Esaurite le varianti, scrive `''`; non cambia le assegnazioni precedenti.

Il comando legge anche gli esercizi modificati e non salvati. Se ne manca uno
o non riesce ad analizzarlo, interrompe senza modificare la verifica.

Con il cursore nel blocco della traccia, la lampadina offre **Elimina**, **Rinomina**
e **Duplica traccia**. Rinomina ed eliminazione aggiornano le assegnazioni;
la duplicazione copia quelle della traccia di partenza. Nel YAML puoi impostare
`etichetta` e contrassegnare al massimo una traccia con `pubblica: true`.
La traccia pubblica viene inclusa in **Tutti i PDF**.

## Punteggi e controllo

I nuovi esercizi inseriti da comando o drop ricevono `punti: 1`, salvo quando un
gruppo antenato ha già `punti` impostato, anche `0`. Puoi disattivare la regola
con `verifiche.defaultExercisePoints`; riguarda soltanto i nuovi inserimenti.

I punteggi scritti su esercizi, gruppi e blocchi istruzioni si sommano: il punteggio
del gruppo non sostituisce né ripartisce quelli dei figli. Per un totale di gruppo
unico, lascia senza punti i figli. I dettagli sono nel [riferimento](../riferimento/formato-verifiche.md#punteggi).

Controlla tutte le tracce nell’anteprima e usa **Verifiche: Controlla tutti i contenuti**
con un file dati attivo. Il canale Output **Verifiche — controllo** riporta errori,
avvisi e totali. Una bozza errata estranea non impedisce l’anteprima della verifica corrente.
