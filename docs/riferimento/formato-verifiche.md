# Formato delle verifiche

[Indice](../README.md) · [Guida operativa](../guida/verifiche.md)

## Documento e tracce

Il file `.yaml` o `.yml` si trova sotto `verifiche` nei contenuti. Non ha front
matter Markdown. Sono obbligatori `titolo` testuale non vuoto, `tracce` non vuoto
e `blocchi` come lista, anche vuota. Un campo `id` al livello principale è vietato:
il percorso del file identifica la verifica.

```yaml
titolo: Passaggi di stato
tracce:
  - id: prova
    pubblica: true
  - id: "1"
    etichetta: Gruppo A
blocchi:
  - esercizio:
      id: scienze/acqua
      punti: 2
      versioni:
        prova: base
        "1": seconda
```

Le tracce richiedono ID distinti, composti da lettere ASCII, numeri, `_` o `-`.
Evita i nomi riservati `default`, `undefined`, `__proto__`, `constructor`, `prototype`;
i default di creazione li rifiutano. Scrivi fra virgolette gli ID numerici per
mantenere esplicita la natura testuale. `etichetta` è il testo facoltativo mostrato
nel selettore e nella stampa; il nome file PDF usa comunque l’ID.
Al massimo una traccia può avere `pubblica: true` (booleano, non stringa).
La sua stampa riporta «Traccia di esempio»; le altre usano l’etichetta o «Traccia ID».
L’export di tutte le tracce include anche la pubblica.

## Assegnazioni

Per ogni uso di esercizio, `versioni` è una mappa non vuota. Le chiavi sono ID
di tracce dichiarate oppure `default`; i valori sono stringhe con il nome di
una variante dell’esercizio oppure la stringa vuota.

```yaml
versioni:
  default: base
  "1": seconda
  "2": ""
```

In una verifica con tracce `prova`, `1`, `2`, questo assegna `base` a `prova`,
`seconda` a `1` e omette l’esercizio nella traccia `2`.

- L’assegnazione esplicita prevale su `default`.
- `default` serve solo alle tracce senza chiave esplicita.
- `''` omette l’esercizio, il suo numero e il suo punteggio.
- Senza assegnazione né default, oppure con una variante inesistente, la traccia è in errore.
- Un valore `null` o numerico non è una stringa valida: usa `''` o virgolette.
- L’esercizio referenziato deve esistere anche se le sue assegnazioni sono tutte vuote.

Per `istruzioni` e `contenuto`, i valori di `versioni` sono invece il testo Markdown
da stampare per ciascuna traccia, non nomi di varianti di un esercizio.

## Tipi di blocco

Ogni elemento di `blocchi` contiene esattamente uno fra `esercizio`, `gruppo`,
`istruzioni`, `contenuto`, `salto_pagina`.

### Esercizio

La forma consigliata è quella completa dell’esempio iniziale:

| Campo interno a `esercizio` | Utilizzo                                                           |
| --------------------------- | ------------------------------------------------------------------ |
| `id`                        | Percorso relativo agli esercizi senza `.md`, con `/`, obbligatorio |
| `versioni`                  | Mappa delle assegnazioni, obbligatoria                             |
| `punti`                     | Numero finito maggiore o uguale a zero, facoltativo                |
| `attributi.class`           | Classi CSS aggiuntive per questo uso dell’esercizio                |
| `attributi.style`           | Stile CSS inline per questo uso                                    |

È accettata anche la forma breve, con proprietà affiancate:

```yaml
- esercizio: scienze/acqua
  punti: 2
  versioni: { default: base }
```

I percorsi non ammettono `\`, segmenti vuoti, `.` o `..`, percorsi assoluti
o caratteri non validi per un nome file. Non inserire l’estensione `.md` nell’ID.

### Gruppo

```yaml
- gruppo:
    istruzioni: Rispondi alle domande.
    punti: 4
    esercizi:
      - esercizio:
          id: scienze/acqua
          versioni: { default: base }
```

`esercizi` è una lista obbligatoria che può contenere tutti i tipi di blocco,
compresi altri gruppi. `istruzioni` è facoltativo e usa le forme descritte sotto.
`punti` è facoltativo; non viene ripartito sui figli. Il punteggio del gruppo
si scrive in `gruppo.punti`: un eventuale `punti` dentro `gruppo.istruzioni`
non contribuisce al totale.

### Istruzioni e contenuto

Entrambi accettano una stringa Markdown oppure un oggetto con `testo` e/o `versioni`.
Le istruzioni hanno uno stile dedicato e possono contribuire al totale tramite
`punti`; il contenuto libero non contribuisce al totale, anche se vi si scrive `punti`.

```yaml
- istruzioni:
    testo: Rispondi in modo completo.
    punti: 1
- contenuto:
    testo: Materiale per tutte le altre tracce.
    versioni:
      "1": Materiale specifico per la traccia 1.
```

La risoluzione del testo usa prima `versioni[traccia]`, poi `versioni.default`,
poi `testo`. Una stringa esplicitamente vuota resta vuota. Se è presente
`versioni` ma manca una risoluzione e manca `testo`, la traccia è in errore.
Per testi su più righe usa YAML `|`, mantenendo l’indentazione.

### Salto pagina

```yaml
- salto_pagina: true
```

Deve essere il booleano `true`. Le interruzioni hanno effetto nell’impaginazione di stampa.

## Punteggi

Il totale somma i punti dei singoli esercizi effettivamente presenti, dei gruppi
e dei blocchi istruzioni. I valori devono essere numeri finiti non negativi;
sono ammessi decimali e zero. Un campo assente non mostra un punteggio.

Un gruppo con `punti: 4` e due esercizi ciascuno con `punti: 2` totalizza **8**.
Per ottenere un totale di **4**, assegna i punti al gruppo oppure ai figli.
Il default automatico dei nuovi inserimenti evita di aggiungere `punti: 1`
se un gruppo antenato ha già un punteggio, ma non modifica i punti preesistenti.

Il controllo globale segnala come avvisi i totali diversi fra tracce e gli
esercizi ripetuti. Gli avvisi richiedono una valutazione del contenuto; non sono
necessariamente errori. Il salvataggio di bozze resta sempre possibile.

Un [esempio completo](../esempi/contenuti/verifiche/dimostrativa.yaml) include i cinque tipi,
gruppi, istruzioni differenziate, contenuto libero e salto pagina.
