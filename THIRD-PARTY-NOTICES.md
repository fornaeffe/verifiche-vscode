# Provenienza e componenti distribuiti

Il motore di rendering, i template e lo stile predefinito derivano dall'applicazione
Verifiche di Luca Fornasari. Il codice di questa estensione è distribuito sotto
GNU GPL versione 3 (GPL-3.0-only), come indicato in LICENSE.

Il pacchetto include componenti con le rispettive licenze:

| Componente | Licenza |
| --- | --- |
| YAML | ISC |
| markdown-it e relative dipendenze | MIT |
| KaTeX | MIT |
| Font KaTeX | SIL Open Font License 1.1 |
| Playwright e Playwright Core | Apache-2.0 |

La build raccoglie i testi delle licenze delle dipendenze del bundle in
`dist/licenses`. Playwright conserva inoltre LICENSE, NOTICE e gli avvisi di terze
parti nelle proprie directory distribuite. Chromium viene installato separatamente
con gli strumenti Playwright; non è incorporato nel VSIX.
