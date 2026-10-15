import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import fs from "node:fs";
import { Settings, settingDefaults } from "../src/settings";
import { exerciseTemplates, exerciseTemplate } from "../src/templates";
import { examTemplate } from "../src/document";
import { exam, exercise } from "../src/core";

const settings = (values: Record<string, unknown> = {}) =>
  new Settings((key) => values[key]);

test("default di dominio e manifest coerenti, settings per risorsa", () => {
  const properties = JSON.parse(fs.readFileSync("package.json", "utf8"))
    .contributes.configuration.properties;
  for (const [key, value] of Object.entries(settingDefaults)) {
    assert.equal(properties[`verifiche.${key}`].default, value);
    assert.equal(properties[`verifiche.${key}`].scope, "resource");
  }
  const defaults = settings();
  assert.equal(defaults.variantName(), "base");
  assert.deepEqual(defaults.traceIds(), { publicId: "prova", firstId: "1" });
  assert.equal(defaults.exerciseFileName(), "nuovo-esercizio.md");
  assert.equal(
    defaults.outputDirectory(path.resolve("dati")),
    path.resolve("dati/output"),
  );
  assert.equal(
    Object.keys(exercise(exerciseTemplate("Esempio", "A")).varianti)[0],
    "base",
  );
  assert.deepEqual(exam(examTemplate("Esempio")).tracce, [
    { id: "prova", pubblica: true },
    { id: "1" },
  ]);
});

test("nomi configurati generano template analizzabili per tutti i tipi", () => {
  const configured = settings({
    defaultVariantName: "iniziale",
    defaultPublicTraceId: "esempio",
    defaultFirstTraceId: "A",
  });
  for (const template of exerciseTemplates) {
    const source = exerciseTemplate(
      "Sintetico",
      template.type,
      configured.variantName(),
    );
    assert.deepEqual(exercise(source).variantOrder, ["iniziale"]);
    assert.doesNotMatch(source, /^id:/m);
  }
  assert.deepEqual(
    exam(examTemplate("Sintetico", configured.traceIds())).tracce,
    [{ id: "esempio", pubblica: true }, { id: "A" }],
  );
});

test("identificatori invalidi e tracce coincidenti indicano il setting", () => {
  for (const value of [
    "",
    " ",
    " a",
    "a ",
    "due parole",
    "a/b",
    "a\nb",
    "default",
    "undefined",
    "__proto__",
    "constructor",
    "prototype",
    null,
    4,
  ]) {
    assert.throws(
      () => settings({ defaultVariantName: value }).variantName(),
      /verifiche\.defaultVariantName/,
    );
    assert.throws(
      () => settings({ defaultPublicTraceId: value }).traceIds(),
      /verifiche\.defaultPublicTraceId/,
    );
    assert.throws(
      () => settings({ defaultFirstTraceId: value }).traceIds(),
      /verifiche\.defaultFirstTraceId/,
    );
  }
  assert.throws(
    () =>
      settings({
        defaultPublicTraceId: "A",
        defaultFirstTraceId: "A",
      }).traceIds(),
    /verifiche\.defaultFirstTraceId/,
  );
  // An invalid creation setting must not prevent PDF export or other operations.
  assert.equal(
    settings({ defaultVariantName: "" }).outputDirectory(path.resolve("dati")),
    path.resolve("dati/output"),
  );
});

test("nome file semplice e portabile, senza percorsi o nomi di dispositivo", () => {
  for (const value of [
    "",
    "../file.md",
    "sotto/file.md",
    "sotto\\file.md",
    "C:file.md",
    ".md",
    "file.txt",
    "file.md ",
    "con.md",
    "NUL.test.md",
    "LPT1.md",
    "COM¹.md",
    "a?.md",
    "a\0.md",
    null,
  ])
    assert.throws(
      () => settings({ defaultExerciseFileName: value }).exerciseFileName(),
      /verifiche\.defaultExerciseFileName/,
    );
  for (const value of ["esempio.md", "Domanda aperta.MD", "prova-1.md"])
    assert.equal(
      settings({ defaultExerciseFileName: value }).exerciseFileName(),
      value,
    );
});

test("output relativo al workspace, annidato o esterno, e assoluto", () => {
  const root = path.resolve("dati");
  for (const value of [
    "pdf",
    "stampe/ottobre",
    "../stampe",
    path.resolve("destinazione"),
  ])
    assert.equal(
      settings({ outputDirectory: value }).outputDirectory(root),
      path.resolve(root, value),
    );
  for (const value of [
    "",
    " ",
    "pdf\0",
    "${workspaceFolder}/pdf",
    "~/pdf",
    "file:///pdf",
    "pdf/CON",
    "pdf/finale.",
    null,
  ])
    assert.throws(
      () => settings({ outputDirectory: value }).outputDirectory(root),
      /verifiche\.outputDirectory/,
    );
});
