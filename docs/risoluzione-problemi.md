# Risoluzione dei problemi

[Indice del manuale](README.md)

| Sintomo o messaggio                               | Controllo e soluzione                                                                                                                                                                                                     |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Nessun CodeLens o comando operativo               | Apri la cartella dati in un workspace attendibile. Il file deve essere `.md` sotto `esercizi` o `.yaml`/`.yml` sotto `verifiche` nella cartella contenuti configurata. Verifica che i CodeLens siano abilitati in VS Code |
| Il template richiede un file vuoto                | Usa un file vuoto o modifica il testo esistente. Il template non sovrascrive documenti compilati                                                                                                                          |
| Anteprima chiusa                                  | Usa Verifiche: Apri anteprima con il file dati attivo; controlla `verifiche.autoPreview`                                                                                                                                  |
| Anteprima di un altro documento                   | Riattiva la verifica o l’esercizio desiderato. Annulla un eventuale selettore varianti ancora aperto                                                                                                                      |
| Manca intestazione YAML / delimitatori non validi | Controlla `---` all’inizio del file esercizio e ogni coppia `:::variante nome` / `:::`. Non lasciare testo fuori dalle varianti                                                                                           |
| YAML non analizzabile                             | Controlla indentazione, liste, virgolette e stringhe multilinea. Usa spazi, non tabulazioni per l’indentazione                                                                                                            |
| Esercizio inesistente o percorso non valido       | Verifica cartella, maiuscole e percorso relativo senza `.md`, con `/`. Una rinomina esterna può aver lasciato riferimenti vecchi                                                                                          |
| Variante non risolta                              | Correggi `versioni` per la traccia indicata o aggiungi `default`; per omettere usa `''`, non un valore mancante                                                                                                           |
| Manca elenco di opzioni/affermazioni              | Aggiungi un elenco nella variante SM, VF o Etichettare                                                                                                                                                                    |
| Allegato mancante / immagine non caricabile       | Controlla esistenza e validità del file sotto gli allegati. Usa `/allegati/nome.ext`; le immagini remote non sono supportate nella stampa                                                                                 |
| Formula senza chiusura o errore KaTeX             | Chiudi `$`/`$$` e usa sintassi supportata. Per la chimica usa `\ce{…}` dentro i delimitatori matematici                                                                                                                   |
| Chromium non trovato                              | Esegui Verifiche: Installa Chromium per i PDF con Internet, poi riprova l’export                                                                                                                                          |
| Totale inatteso                                   | I punti di gruppi, istruzioni ed esercizi si sommano; un esercizio omesso con `''` non contribuisce                                                                                                                       |
| Nuova traccia senza alcuni esercizi               | Le varianti non vuote libere sono esaurite. Aggiungine altre o assegna manualmente quelle desiderate                                                                                                                      |
| PDF diverso dall’ultima anteprima                 | Riattiva la verifica, controlla la traccia, attendi l’aggiornamento e riesporta senza modifiche simultanee a dati o risorse                                                                                               |
| CSS ignorato                                      | Il file deve essere `stili/predefinito.css` nella radice workspace, anche con contenuti annidati. La copia nei dati non viene aggiornata automaticamente                                                                  |
| Impostazione invalida                             | Correggi la chiave indicata nei Settings, anche nell’ambito cartella del workspace multiplo                                                                                                                               |
| Setup rifiuta la destinazione                     | Deve essere nuova o vuota. Dopo un errore parziale controlla l’elenco degli elementi già creati prima di riprovare                                                                                                        |
| Git fallisce nel setup                            | La cartella dati rimane utilizzabile; installa/configura Git separatamente se vuoi versionarla                                                                                                                            |

## Controllare l’intero archivio

Apri un documento dati ed esegui **Verifiche: Controlla tutti i contenuti**.
Leggi il canale Output **Verifiche — controllo**: comprende errori, avvisi e
risultati per traccia. Correggi gli errori indicati e ripeti.
Il controllo globale è esplicito; la diagnostica dei documenti visibili e
l’anteprima lavorano sulle loro dipendenze. Una bozza errata estranea può apparire
nel controllo globale senza bloccare la stampa di una verifica valida.

Per difficoltà persistenti consulta [Supporto](../SUPPORT.md): domande nelle
Discussions e difetti riproducibili nelle Issues, usando un esempio sintetico.
