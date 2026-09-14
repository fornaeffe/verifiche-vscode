export const exerciseTemplates = [
  {
    type: "A",
    name: "Risposta aperta",
    description: "Una domanda con spazio per una risposta libera.",
    body: "Scrivi qui la domanda aperta.",
  },
  {
    type: "SM",
    name: "Scelta multipla",
    description: "Una domanda seguita dalle possibili risposte.",
    body: `Scegli la risposta corretta.

- Prima opzione
- Seconda opzione
- Terza opzione`,
  },
  {
    type: "VF",
    name: "Vero o falso",
    description: "Un elenco di affermazioni da valutare.",
    body: `Indica se ciascuna affermazione è vera o falsa.

- Prima affermazione
- Seconda affermazione`,
  },
  {
    type: "Etichettare",
    name: "Etichettare",
    description: "Un elenco di elementi da associare alle etichette.",
    body: `Etichetta gli elementi indicati.

- Primo elemento
- Secondo elemento`,
  },
  {
    type: "Completamento",
    name: "Completamento",
    description: "Un testo con spazi predisposti da completare.",
    body: `Completa il testo seguente.

La __________ è __________.`,
  },
] as const;

export type ExerciseTemplateType = (typeof exerciseTemplates)[number]["type"];

export function exerciseTemplate(id: string, type: ExerciseTemplateType) {
  const template = exerciseTemplates.find((item) => item.type === type);
  if (!template) throw Error("Template esercizio non valido");
  return `---
tipo: ${type}
titolo: ${id}
---

:::variante base
${template.body}
:::
`;
}
