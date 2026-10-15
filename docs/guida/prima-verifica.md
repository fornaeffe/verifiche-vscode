# La prima verifica

[Indice del manuale](../README.md)

Il percorso seguente usa i nomi predefiniti delle impostazioni. Alla fine avrai
un esercizio con due varianti e due PDF. Tutti i contenuti sono sintetici.

## 1. Installare e creare la cartella dati

Installa il `.vsix` da **Extensions: Install from VSIX…** nel menu della vista
Estensioni. Apri la Command Palette e scegli **Verifiche: Crea cartella dati…**,
disponibile anche senza documenti aperti.

Scegli **Nuova cartella** (genitore e nome) oppure **Cartella vuota esistente**,
poi **Solo cartella dati** oppure **Inizializza anche Git**. La cartella si apre
in una nuova finestra. Git è facoltativo e richiede Git installato: il comando
non crea commit né remoti. Annullando le scelte precedenti non vengono creati file.
Se VS Code chiede l’attendibilità, confermala soltanto per una cartella di cui ti fidi.

La struttura creata è descritta nella [guida all’archivio](archivio.md).
Puoi anche aprire direttamente una cartella dati già predisposta.

## 2. Creare un esercizio

Da Explorer crea `contenuti/esercizi/scienze/acqua.md`, anche creando la
sottocartella `scienze`. Nel file vuoto fai clic su **Inserisci template esercizio**:
ottieni il tipo Risposta aperta (`A`) e la variante `base`.

Sostituisci la domanda con «Descrivi un passaggio di stato dell’acqua».
Usa **Aggiungi variante**, chiamala `seconda` e scrivi «Spiega che cosa accade
durante l’evaporazione». Il risultato è:

```markdown
---
tipo: A
titolo: Acqua
---

:::variante base
Descrivi un passaggio di stato dell’acqua.
:::

:::variante seconda
Spiega che cosa accade durante l’evaporazione.
:::
```

Salva con `Ctrl+S` (`Cmd+S` su macOS). L’anteprima mostra le due varianti;
se non è aperta usa **Verifiche: Apri anteprima**.

## 3. Comporre la verifica

Crea `contenuti/verifiche/acqua.yaml` e fai clic su **Inserisci template verifica**.
Nel template trovi la traccia pubblica `prova`, la traccia ordinaria `1` e `blocchi: []`.

Usa **Inserisci blocco**, scegli **Esercizio** e seleziona `scienze/acqua`.
Avendolo creato prima dell’inserimento, vengono assegnate automaticamente le due
varianti non vuote: `base` alla pubblica e `seconda` alla traccia `1`.
Con le impostazioni predefinite il risultato è equivalente a:

```yaml
titolo: Acqua
tracce:
  - id: prova
    pubblica: true
  - id: "1"
blocchi:
  - esercizio:
      id: scienze/acqua
      punti: 1
      versioni:
        prova: base
        "1": seconda
```

Il comando **Nuovo esercizio…**, usato durante l’inserimento, crea invece un
esercizio di tipo `A` senza assegnazioni: dopo averlo compilato devi scegliere
esplicitamente le varianti nella verifica.

## 4. Controllare le tracce

Torna alla verifica. Nell’anteprima usa il selettore della traccia e controlla
domanda, numerazione e punteggio. Per cambiare una variante, metti il cursore
sulla riga `prova: base` o `"1": seconda`, apri la lampadina e scegli
**Scegli variante per la traccia …**. Le schede renderizzate permettono di scegliere
la variante oppure **Nessuna assegnazione**, che omette quell’esercizio.

Salva i file. Con la verifica attiva esegui **Verifiche: Controlla tutti i contenuti**:
i risultati sono nel pannello Output, canale **Verifiche — controllo**.
Il controllo può elencare anche errori di altre bozze presenti nella stessa cartella dati.

## 5. Produrre i PDF

Se Chromium manca, esegui **Verifiche: Installa Chromium per i PDF** con una
connessione Internet. Poi riapri la verifica e usa **Tutti i PDF** nell’anteprima,
oppure **Verifiche: Esporta tutti i PDF** nella Command Palette.

Troverai `output/acqua/traccia-prova.pdf` e `output/acqua/traccia-1.pdf`.
**Esporta PDF** nell’anteprima stampa soltanto la traccia selezionata.
I PDF omonimi vengono sovrascritti: aprili e controlla l’impaginazione prima della distribuzione.

Prosegui con [Esercizi](esercizi.md), [Verifiche](verifiche.md) o
[Anteprima e PDF](anteprima-pdf.md). Un archivio più ampio è negli [esempi](../esempi/README.md).
