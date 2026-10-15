# Scrivere esercizi

[Indice del manuale](../README.md) · [Sintassi completa](../riferimento/formato-esercizi.md)

## Creare e scegliere il tipo

Crea un file `.md` dentro `contenuti/esercizi`, anche in sottocartelle, e usa
i CodeLens nel documento vuoto. **Inserisci template esercizio** crea il tipo `A`;
gli altri collegamenti scelgono direttamente il tipo.

| Tipo                   | Come scriverlo                             | Risultato                                                                                       |
| ---------------------- | ------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| `A` — Risposta aperta  | Domanda in Markdown                        | Testo della domanda; eventuale spazio per rispondere va predisposto nel contenuto o nello stile |
| `SM` — Scelta multipla | Domanda seguita da elenco                  | Primo elenco trasformato in opzioni alfabetiche                                                 |
| `VF` — Vero o falso    | Consegna seguita da elenco di affermazioni | Spazi V/F accanto alle affermazioni                                                             |
| `Etichettare`          | Consegna seguita da elenco                 | Spazio di risposta accanto a ogni elemento                                                      |
| `Completamento`        | Testo con spazi, per esempio `__________`  | Interlinea adatta al completamento; i vuoti sono quelli scritti nel testo                       |

L’estensione impagina i contenuti; non valuta risposte né genera automaticamente
soluzioni o alternative. Per SM, VF ed Etichettare inserisci un elenco nella variante.
Trovi un file per ogni tipo negli [esempi](../esempi/README.md).

## Gestire le varianti

Usa **Aggiungi variante**, **Duplica variante** o **Rinomina variante** nei CodeLens.
La rinomina aggiorna anche le assegnazioni nelle verifiche della stessa cartella dati;
salva i documenti modificati. Se una verifica non è analizzabile, correggila prima
di ripetere l’operazione. Per cancellare una variante modifica il testo e controlla
gli utilizzi: non esiste un comando dedicato di eliminazione variante.

Mantieni nomi distinti e semplici, per esempio `base`, `seconda`, `recupero`.
Una variante appena aggiunta è vuota: compilala prima di assegnarla. I comandi
di assegnazione automatica ignorano le varianti vuote; il testo segnaposto dei
template conta invece come contenuto e va sostituito.

Per scoprire dove è usato un esercizio o una variante, usa **Find All References**
nel menu dell’editor sul relativo identificatore. Dalla verifica, F12 o Ctrl+click
(Cmd+click su macOS) sul percorso apre l’esercizio.

## Immagini e formule

Incolla un’immagine dagli appunti oppure trascinala nel file esercizio:
l’estensione la copia in `contenuti/allegati` e inserisce il riferimento Markdown.
Se il drop offre più azioni, scegli quella dell’immagine; in alcune configurazioni
VS Code richiede Shift durante il trascinamento. Incollare testo resta una normale
operazione di testo.

Usa immagini locali. Per esempio:

```markdown
![Schema dell’acqua](/allegati/schema.svg){width=45mm}

La velocità è $v = s/t$.

$$E = mc^2$$

L’acqua ha formula $\ce{H2O}$.
```

**Verifiche: Inserisci formula chimica**, oppure `Ctrl+K` poi `Ctrl+Alt+H`
(`Cmd+K` poi `Cmd+Alt+H` su macOS), inserisce `$\ce{}$` con il cursore
fra le graffe. Le formule usano la sintassi supportata da KaTeX e mhchem;
comandi LaTeX non supportati producono un errore.

Le dimensioni e i percorsi delle immagini sono descritti nel
[riferimento del formato](../riferimento/formato-esercizi.md).
