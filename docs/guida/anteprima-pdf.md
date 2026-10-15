# Anteprima, stile e PDF

[Indice del manuale](../README.md)

## Consultare l’anteprima

L’anteprima segue il documento dati attivo: mostra le varianti di un esercizio
oppure la traccia selezionata di una verifica. Si può chiudere e riaprire con
**Verifiche: Apri anteprima**. `verifiche.autoPreview: false` disattiva l’apertura automatica.
I contenuti non salvati partecipano al rendering.

Nella verifica il menu in alto cambia traccia. Il selettore varianti è una modalità
temporanea dello stesso pannello: conferma con **Usa …** o **Nessuna assegnazione**,
oppure annulla con **Annulla (Esc)**. Chiudi esplicitamente il selettore prima
di passare ad attività estranee: il passaggio a un file fuori dai contenuti può lasciarlo aperto.

## Installare Chromium ed esportare

Per stampare occorre Chromium. Se manca, usa **Verifiche: Installa Chromium per i PDF**:
il download richiede Internet. Dopo il setup l’esportazione usa risorse locali.

Apri la verifica e seleziona la traccia nell’anteprima:

- **Esporta PDF** / **Verifiche: Esporta traccia PDF**: traccia corrente.
- **Tutti i PDF** / **Verifiche: Esporta tutti i PDF**: tutte le tracce dichiarate,
  inclusa la pubblica.

Con le impostazioni predefinite, `contenuti/verifiche/scienze/acqua.yaml` produce
`output/scienze/acqua/traccia-prova.pdf`, `traccia-1.pdf`, ecc.
L’ID della traccia determina il nome del PDF; `etichetta` ne cambia il testo visibile.
Le cartelle vengono create e i PDF omonimi sovrascritti. **Apri cartella** nel
messaggio finale mostra la destinazione. File di precedenti tracce eliminate
non vengono rimossi automaticamente.

`verifiche.outputDirectory` accetta un percorso relativo alla radice workspace o
assoluto, anche esterno. Non espande `${workspaceFolder}`, `~` o URI.
Il riferimento completo è nelle [impostazioni](../riferimento/comandi-impostazioni.md).

Errori di riferimenti, formule o immagini impediscono l’export interessato;
prima di **Tutti i PDF** controlla tutte le tracce. Anteprima ed export acquisiscono
i contenuti correnti in operazioni distinte: evita modifiche simultanee a testi,
immagini o stile mentre esporti e controlla il PDF finale.

## Personalizzare lo stile

Anteprima ed export cercano `stili/predefinito.css` nella radice workspace, anche
quando i contenuti sono annidati. Se manca, usano lo stile incluso nell’estensione.
Il setup ne copia una versione modificabile; le copie personali non vengono
aggiornate automaticamente con l’estensione.

Lo stile predefinito stampa in A4, con margini di 8 mm, numerazione continua e
accorgimenti per tenere uniti i blocchi. Un esercizio troppo lungo può comunque
richiedere di modificare il contenuto o la disposizione dei blocchi.

Puoi aggiungere in fondo al CSS, per esempio:

```css
/* Classe applicabile a un singolo uso dell’esercizio. */
.esercizio.compatto {
  font-size: 11pt;
}
@page {
  size: A4;
  margin: 10mm;
}
```

Nella verifica applica la classe all’esercizio con `attributi: {class: compatto}`.
Sono disponibili `.esercizio`, `.a`, `.sm`, `.vf`, `.etichettare`, `.completamento`,
`.istruzioni`, `.opzioni`, `.risposta`, `.punti`, `.numero`, `.traccia`, `.header`,
`.page-break` e `footer`. Mantieni CSS e immagini locali per l’uso offline.
Per forzare una pagina nuova usa il blocco YAML `salto_pagina: true`.
