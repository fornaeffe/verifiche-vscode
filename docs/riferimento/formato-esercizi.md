# Formato degli esercizi

[Indice](../README.md) · [Guida operativa](../guida/esercizi.md)

## File e intestazione

Ogni esercizio è un file `.md` sotto la cartella `esercizi` dei contenuti.
L’identificatore deriva dal percorso relativo senza `.md`, con `/` come separatore.
Il file inizia direttamente con il front matter YAML fra due righe `---`:

```markdown
---
tipo: A
titolo: Passaggi di stato
---

:::variante base
Descrivi la fusione del ghiaccio.
:::

:::variante seconda
Descrivi l’evaporazione dell’acqua.
:::
```

| Campo    | Regola                                                                                          |
| -------- | ----------------------------------------------------------------------------------------------- |
| `tipo`   | Obbligatorio: `A`, `SM`, `VF`, `Etichettare` o `Completamento`, rispettando maiuscole/minuscole |
| `titolo` | Facoltativo; titolo descrittivo, non identificatore né testo della domanda                      |
| `id`     | Vietato nel front matter: l’identificatore deriva dal percorso                                  |

Altri metadati sono conservati ma non definiscono nuove funzionalità di rendering.
`origine` è un metadato storico che modifica la compatibilità di contenuti importati:
non aggiungerlo per aggirare controlli nei nuovi esercizi.

## Varianti

Ogni variante ha un’apertura `:::variante nome` e una chiusura `:::` su righe
separate. Serve almeno una variante; non è ammesso testo non vuoto fuori dai
blocchi. I nomi devono essere univoci nel file. L’ordine testuale determina
l’ordine delle assegnazioni automatiche.

Per nuovi nomi usa lettere ASCII, numeri, `_` e `-`; evita `default`, `undefined`,
`__proto__`, `constructor` e `prototype`. È la convenzione compatibile con i default
di creazione. Il lettore di documenti storici accetta anche alcuni nomi più ampi
(senza spazi), mentre i comandi di creazione/rinomina applicano vincoli più stretti.
I tre nomi `__proto__`, `constructor`, `prototype` sono rifiutati anche dal lettore.

Una variante può essere vuota come bozza. Le assegnazioni automatiche saltano
quelle il cui contenuto è vuoto dopo la rimozione degli spazi ai bordi.
Assegnare una variante vuota non equivale a omettere l’esercizio: per l’omissione
usa `''` nella [mappa versioni](formato-verifiche.md#assegnazioni).

## Markdown e tipi

Sono disponibili paragrafi, enfasi, elenchi, tabelle, collegamenti, codice e HTML
nel contenuto. Per un’andata a capo usa un nuovo paragrafo oppure la sintassi
Markdown di interruzione: il singolo a capo non è un’interruzione forzata.
Gli script non fanno parte dei contenuti eseguibili dell’anteprima o della stampa.

Per `SM`, `VF` ed `Etichettare` ogni variante deve contenere un elenco.
Il primo elenco diventa un elenco alfabetico; VF aggiunge `V ☐ F ☐`, Etichettare
uno spazio di risposta. Usa elenchi semplici per le opzioni, evitando strutture
annidate complesse. `A` rende il normale Markdown; `Completamento` usa
un’interlinea maggiore, ma richiede di scrivere esplicitamente gli spazi da compilare.

```markdown
Scegli il passaggio da solido a liquido.

- Fusione
- Condensazione
- Sublimazione
```

## Formule

`$v = s/t$` rende una formula in linea; `$$E = mc^2$$` una formula in modalità
display. Sono necessari i delimitatori di chiusura e comandi supportati da KaTeX.
Per la chimica è disponibile mhchem: `$\ce{H2O}$`, `$\ce{2H2 + O2 -> 2H2O}$`.
Non si tratta di un compilatore LaTeX completo. Un errore nella formula impedisce
il rendering interessato.

## Immagini locali

Colloca gli allegati sotto `contenuti/allegati` (o sotto la cartella contenuti
configurata) e usa percorsi dalla sua radice:

```markdown
![Schema](/allegati/schema.svg)
![Schema ridotto](/allegati/schema.svg){width=45mm}
![Schema a destra](/allegati/schema.svg){width=30% float=right}
```

La forma estesa ammette `width` numerico con unità `mm`, `cm`, `px` o `%`,
seguito facoltativamente da `float=left` o `float=right`, in questo ordine.
Non aggiungere spazi fra `)` e `{`. Preferisci nomi di file semplici; per gli spazi
nel percorso usa `%20`. Non sono consentiti percorsi che escano dagli allegati.

La stampa della verifica richiede immagini locali sotto `/allegati/`: URL remoti,
percorsi assoluti del computer e immagini incorporate come data URI non sono
il formato supportato. PNG, JPEG, SVG, WebP e GIF sono gestiti come risorse locali.
Anteprima e PDF possono differire se una risorsa viene modificata durante l’export.
