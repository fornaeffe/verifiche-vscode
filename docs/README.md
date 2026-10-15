# Manuale di Verifiche

Guida all’utilizzo dell’estensione VS Code. Per iniziare serve l’estensione
installata in VS Code desktop 1.100 o successivo, in un workspace attendibile.
Apri questo indice con **Verifiche: Apri guida** dalla Command Palette
(`Ctrl+Shift+P`, `Cmd+Shift+P` su macOS). I collegamenti locali funzionano anche offline.

## Scegli il tuo percorso

| Obiettivo                                                | Leggi                                                         |
| -------------------------------------------------------- | ------------------------------------------------------------- |
| Arrivare al primo PDF                                    | [La prima verifica](guida/prima-verifica.md)                  |
| Scrivere domande e varianti, inserire formule e immagini | [Esercizi](guida/esercizi.md)                                 |
| Comporre una verifica e differenziare le tracce          | [Verifiche](guida/verifiche.md)                               |
| Organizzare file, rinominare e trovare gli utilizzi      | [Archivio](guida/archivio.md)                                 |
| Stampare e personalizzare l’aspetto                      | [Anteprima e PDF](guida/anteprima-pdf.md)                     |
| Consultare la sintassi Markdown degli esercizi           | [Formato esercizi](riferimento/formato-esercizi.md)           |
| Consultare la sintassi YAML delle verifiche              | [Formato verifiche](riferimento/formato-verifiche.md)         |
| Trovare un comando o configurare un default              | [Comandi e impostazioni](riferimento/comandi-impostazioni.md) |
| Risolvere un errore                                      | [Risoluzione dei problemi](risoluzione-problemi.md)           |
| Affidare a un agente la modifica dei contenuti           | [Uso con agenti](uso-con-agenti.md)                           |
| Provare un archivio dimostrativo                         | [Esempi sintetici](esempi/README.md)                          |

## Glossario

- **Cartella dati**: cartella aperta in VS Code che contiene esercizi, verifiche,
  allegati e l’eventuale stile. È indipendente dal sorgente dell’estensione.
- **Esercizio**: file `.md` riutilizzabile in più verifiche, con un tipo e almeno una variante.
- **Variante**: contenuto nominato di un esercizio, delimitato da `:::variante nome` e `:::`.
- **Verifica**: file `.yaml` o `.yml` che compone blocchi e dichiara le tracce.
- **Traccia**: una versione stampabile della verifica. Seleziona una variante per
  ogni esercizio attraverso la mappa `versioni`. Una sola traccia può essere pubblica.
- **ID esercizio**: percorso relativo alla cartella `esercizi`, senza `.md`, con `/`
  anche su Windows. `scienze/acqua.md` ha ID `scienze/acqua`.
- **CodeLens**: collegamento operativo sopra una riga dell’editor.
- **Lampadina**: menu delle azioni disponibili nella posizione del cursore,
  apribile anche con `Ctrl+.` (`Cmd+.` su macOS).

Le guide spiegano le operazioni; i documenti di riferimento definiscono la sintassi.
Gli esempi descrivono il comportamento corrente, non funzionalità future.
Per assistenza consulta [Supporto](../SUPPORT.md); per le novità apri la scheda
**Changelog** nella pagina dell’estensione in VS Code.
