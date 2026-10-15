# Esempi sintetici

[Indice del manuale](../README.md)

Questa cartella contiene un piccolo archivio dimostrativo, incluso anche
nell’installazione. Non contiene dati reali e non viene copiato automaticamente
dal setup.

## Provarli

1. Crea una cartella dati con **Verifiche: Crea cartella dati…**.
2. Copia la sottocartella `contenuti` di questi esempi nella cartella appena creata.
   Se usi un `contentDirectory` diverso, copia le tre sottocartelle nella destinazione
   configurata. Per un archivio già popolato controlla prima le collisioni: non
   sovrascrivere tuoi file con lo stesso nome.
3. Apri `verifiche/dimostrativa.yaml` da Explorer, controlla le due tracce e usa
   **Verifiche: Controlla tutti i contenuti**. Ogni traccia contiene cinque esercizi
   e totalizza 10 punti.
4. Installa Chromium se necessario, poi usa **Tutti i PDF**. Il salto pagina separa
   le due sezioni; l’impaginazione finale dipende anche dal CSS della cartella dati.

Nel manuale installato puoi aprire i singoli file dai collegamenti sotto;
**non modificarli nella cartella dell’estensione**. Per trovare la cartella da
copiare, apri uno dei file tramite collegamento (per un Markdown, passa prima
all’editor del sorgente dall’anteprima) e usa **Reveal in File Explorer**
(o l’equivalente del tuo sistema) dal menu della scheda dell’editor.

| File                                                            | Dimostra                                                                                                     |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| [acqua.md](contenuti/esercizi/scienze/acqua.md)                 | Risposta aperta, due varianti, immagine locale e formula chimica                                             |
| [scelta.md](contenuti/esercizi/scienze/scelta.md)               | Scelta multipla                                                                                              |
| [vero-falso.md](contenuti/esercizi/scienze/vero-falso.md)       | Affermazioni VF                                                                                              |
| [etichette.md](contenuti/esercizi/scienze/etichette.md)         | Elenco con spazio di risposta                                                                                |
| [completamento.md](contenuti/esercizi/scienze/completamento.md) | Testo da completare e formula matematica                                                                     |
| [schema.svg](contenuti/allegati/schema.svg)                     | Allegato sintetico locale                                                                                    |
| [dimostrativa.yaml](contenuti/verifiche/dimostrativa.yaml)      | Cinque tipi, gruppo annidato, punteggio di gruppo, default, istruzioni per traccia, contenuto e salto pagina |

Per costruire da zero un esempio più piccolo segui [La prima verifica](../guida/prima-verifica.md).
