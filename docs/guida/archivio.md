# Organizzare l’archivio

[Indice del manuale](../README.md)

## Struttura della cartella dati

Apri in VS Code la cartella dati, non soltanto un singolo file. Il comando
**Verifiche: Crea cartella dati…** prepara una cartella nuova o vuota:

```text
contenuti/
  esercizi/       # file .md, anche in sottocartelle
  verifiche/      # file .yaml o .yml, anche in sottocartelle
  allegati/       # immagini locali
stili/
  predefinito.css
.gitignore       # esclude /output/
README.md        # istruzioni essenziali della cartella dati
```

Le cartelle dei contenuti includono `.gitkeep`, utili per conservarle vuote in Git.
`output/` viene creata al primo export. Non occorre un checkout del software accanto ai dati.

Il setup rifiuta cartelle non vuote e non sovrascrive file. Se Git fallisce, la
cartella rimane utilizzabile e compare un avviso. Un errore di creazione elenca
gli elementi già creati: controllali prima di riprovare, perché la destinazione
potrebbe non essere più vuota. Non vengono eliminati automaticamente.

## Percorsi e workspace

L’ID di `contenuti/esercizi/scienze/acqua.md` è `scienze/acqua`, con `/` anche
su Windows e senza estensione. Non inserire `id` nel front matter degli esercizi.
Le verifiche si riferiscono agli esercizi della propria cartella dati.

`verifiche.contentDirectory` cambia il percorso dei contenuti rispetto alla radice
workspace, per esempio `archivio/contenuti`. Nel setup deve essere un percorso
relativo interno senza `.` o `..`, variabili o nomi invalidi; le prime cartelle
`stili`, `output`, `.git` e `.vscode` sono riservate. Il comando legge la configurazione
della destinazione e conserva quella non predefinita in `.vscode/settings.json`.
Le cartelle `stili` e `output` rimangono nella radice workspace.

Un workspace con più cartelle può configurare valori diversi per ciascuna.
L’estensione risolve ogni documento nella propria cartella. Per cambiare la
posizione dei contenuti in un archivio esistente, sposta i file e aggiorna il setting
coerentemente; riapri la finestra per riallineare anche gli osservatori del filesystem.

## Ricerca, rinomina e salvataggio

Usa Explorer per cartelle, duplicazione, rinomina e spostamento; usa la ricerca
nativa di VS Code per il testo. F12 sul riferimento nella verifica apre l’esercizio;
**Find All References** trova gli utilizzi di esercizi e varianti.

Le rinomine e gli spostamenti eseguiti da Explorer aggiornano gli usi nei documenti
analizzabili. Salva anche le verifiche modificate da VS Code. YAML non analizzabili
sono segnalati e richiedono correzione; dopo l’operazione esegui il controllo globale.
Spostare fuori dalla radice esercizi non mantiene un riferimento utilizzabile.
Le modifiche eseguite da strumenti esterni possono lasciare riferimenti mancanti.

Anteprima ed export usano anche il testo non salvato aperto in VS Code. Salva
normalmente con `Ctrl+S`/`Cmd+S`, **Save All** o Auto Save; la presenza di errori
non impedisce di salvare una bozza.

## Git e copie di sicurezza

Git è facoltativo: il setup può inizializzarlo localmente, senza commit o remoti.
Versiona i contenuti e gli stili che vuoi conservare; i PDF sono output rigenerabili.
Se cambi `verifiche.outputDirectory`, adegua `.gitignore` se vuoi escludere la nuova destinazione.
Prima di modifiche estese conserva una revisione o una copia della cartella.
Mantieni l’archivio personale separato dal repository pubblico dell’estensione.
