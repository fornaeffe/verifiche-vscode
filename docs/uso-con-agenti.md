# Usare un agente sui contenuti

[Indice del manuale](README.md)

Questa guida riguarda la creazione o modifica dei tuoi esercizi e delle tue
verifiche. L’estensione non richiede un account LLM e non espone un servizio MCP
dedicato: un agente può lavorare sui file se il suo ambiente gli consente di accedervi.

## Documenti da fornire per compito

| Compito                               | Riferimenti necessari                                                                           |
| ------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Scrivere o revisionare un esercizio   | [Formato esercizi](riferimento/formato-esercizi.md) e soli file coinvolti                       |
| Comporre o differenziare una verifica | [Formato verifiche](riferimento/formato-verifiche.md), verifica e varianti degli esercizi usati |
| Riorganizzare l’archivio              | [Archivio](guida/archivio.md), riferimenti interessati e istruzioni locali                      |
| Correggere un errore di rendering     | Formato pertinente, messaggio d’errore e risorse coinvolte                                      |

Comunica all’agente la radice dati effettiva e le eventuali impostazioni non
predefinite; non serve fargli leggere la documentazione di sviluppo dell’estensione.
Le regole e decisioni della tua cartella dati, compresi eventuali `AGENTS.md`,
rimangono il riferimento per contenuti privati e vincoli didattici.

## Procedura consigliata

1. Specifica obiettivo, classe/livello, contenuti, numero di tracce, punteggi,
   difficoltà ed esercizi da conservare. Indica i file che possono essere modificati.
2. Fai individuare i documenti e le sole dipendenze necessarie, poi consultare il
   riferimento pertinente. Un ID esercizio è un percorso senza `.md`, non un campo
   nel front matter.
3. Richiedi modifiche circoscritte, preservando testo e metadati non coinvolti.
   Le rinomine esterne devono aggiornare esplicitamente tutti i riferimenti:
   non hanno gli automatismi di Explorer nell’estensione.
4. Controlla che ogni traccia risolva le varianti previste, che `''` sia usato
   solo per omissioni intenzionali e che i punti dei gruppi non duplichino quelli dei figli.
5. Riapri i file in VS Code, esegui **Verifiche: Controlla tutti i contenuti**,
   controlla ogni traccia nell’anteprima e poi i PDF. Per modifiche esterne,
   risolvi prima eventuali buffer locali non salvati per evitare di perdere revisioni.
6. Chiedi un resoconto dei file cambiati e dei controlli realmente eseguiti.
   Distingui validazione automatica, verifica dell’impaginazione e revisione didattica.

## Esempio di richiesta

> Nella cartella dati indicata, prepara una verifica sui passaggi di stato con
> una traccia pubblica e due ordinarie. Usa i formati documentati e conserva gli
> esercizi esistenti non coinvolti. Ogni traccia ordinaria deve totalizzare 10 punti.
> Non omettere esercizi senza segnalarlo. Riporta file cambiati, assegnazioni e
> controlli eseguiti; lascia a me la revisione didattica e del PDF.

Un agente che dispone separatamente della CLI può usarla per controlli su file
salvati; la CLI non legge i settings VS Code, assume `contenuti` e non vede i buffer
non salvati. Le istruzioni CLI sono nel repository del software, non sono un
prerequisito per usare l’estensione installata.

Non inviare archivi personali o prove reali al repository pubblico per chiedere
supporto: prepara una riproduzione sintetica secondo [Supporto](../SUPPORT.md).
