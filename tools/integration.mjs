import { runTests } from "@vscode/test-electron";
import { build } from "esbuild";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import net from "node:net";
import { chromium } from "playwright";
import { connect } from "./cdp.mjs";
import { checkStyles } from "./check-styles.mjs";
const temp = await fs.mkdtemp(path.join(os.tmpdir(), "verifiche-host-"));
delete process.env.ELECTRON_RUN_AS_NODE;
try {
  await fs.cp("test/fixtures/workspace", path.join(temp, "workspace"), {
    recursive: true,
  });
  const secondRoot = path.join(temp, "second-workspace");
  await fs.cp("test/fixtures/workspace", path.join(secondRoot, "archivio"), {
    recursive: true,
  });
  await fs.mkdir(path.join(secondRoot, ".vscode"), { recursive: true });
  await fs.writeFile(
    path.join(secondRoot, ".vscode/settings.json"),
    JSON.stringify({
      "verifiche.contentDirectory": "archivio/contenuti",
      "verifiche.defaultVariantName": "seconda",
      "verifiche.defaultPublicTraceId": "modello",
      "verifiche.defaultFirstTraceId": "Z",
      "verifiche.defaultExerciseFileName": "secondo.md",
      "verifiche.outputDirectory": "pdf/secondo",
    }),
  );
  const workspaceFile = path.join(temp, "integration.code-workspace");
  await fs.writeFile(
    workspaceFile,
    JSON.stringify({
      folders: [{ path: "workspace" }, { path: "second-workspace" }],
    }),
  );
  await build({
    entryPoints: ["test/integration/suite.ts"],
    bundle: true,
    platform: "node",
    format: "cjs",
    outfile: ".vscode-test/suite.cjs",
    external: ["vscode"],
  });
  const executable = process.env.VSCODE_EXECUTABLE;
  const server = net.createServer();
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const port = server.address().port;
  await new Promise((r) => server.close(r));
  const run = runTests({
    extensionDevelopmentPath:
      process.env.VERIFICHE_EXTENSION_PATH ?? process.cwd(),
    extensionTestsPath: path.resolve(".vscode-test/suite.cjs"),
    ...(executable
      ? { vscodeExecutablePath: executable }
      : { version: "1.100.0" }),
    launchArgs: [
      workspaceFile,
      "--disable-extensions",
      "--skip-welcome",
      "--skip-release-notes",
      "--remote-debugging-address=127.0.0.1",
      "--remote-debugging-port=" + port,
      "--user-data-dir=" + path.join(temp, "profile"),
    ],
    extensionTestsEnv: {
      VERIFICHE_TEST_ROOT: path.join(temp, "workspace"),
      VERIFICHE_TEST_SECOND_ROOT: secondRoot,
      VERIFICHE_UI_TEST: temp,
      VERIFICHE_TEST_RESULTS: path.resolve("test-results"),
    },
  });
  const ui = async () => {
    let browser, cdp;
    try {
      const deadline = Date.now() + 90000;
      while (Date.now() < deadline) {
        try {
          await fs.access(path.join(temp, "ui-ready-setup"));
          break;
        } catch {
          await new Promise((r) => setTimeout(r, 200));
        }
      }
      await fs.access(path.join(temp, "ui-ready-setup"));
      browser = await chromium.connectOverCDP("http://127.0.0.1:" + port);
      const page = browser.contexts()[0].pages()[0];
      await page.getByText("Nuova cartella", { exact: true }).waitFor();
      await page.keyboard.press("Escape");
      const formulaDeadline = Date.now() + 30000;
      while (Date.now() < formulaDeadline) {
        try {
          await fs.access(path.join(temp, "ui-ready-formula"));
          break;
        } catch {
          await new Promise((r) => setTimeout(r, 100));
        }
      }
      await fs.access(path.join(temp, "ui-ready-formula"));
      const modifier = process.platform === "darwin" ? "Meta" : "Control";
      await page.keyboard.press(modifier + "+k");
      await page.keyboard.press(modifier + "+Alt+h");
      const cancelDeadline = Date.now() + 30000;
      while (Date.now() < cancelDeadline) {
        try {
          await fs.access(path.join(temp, "ui-ready-cancel"));
          break;
        } catch {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }
      await fs.access(path.join(temp, "ui-ready-cancel"));
      const targets = await fetch(
        "http://127.0.0.1:" + port + "/json/list",
      ).then((r) => r.json());
      const webview = targets.find(
        (t) => t.type === "iframe" && t.url.startsWith("vscode-webview:"),
      );
      if (!webview) throw Error("Webview non trovata");
      cdp = await connect(webview.webSocketDebuggerUrl);
      const findTarget = async (selector) => {
        for (let i = 0; i < 100; i++) {
          for (const contextId of cdp.contexts) {
            const result = await cdp
              .send("Runtime.evaluate", {
                contextId,
                expression: `!!document.querySelector(${JSON.stringify(selector)})`,
                returnByValue: true,
              })
              .catch(() => undefined);
            if (result?.result?.value) return contextId;
          }
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      };

      let target = await findTarget("#cancel");
      if (!target) throw Error("Pulsante Annulla non visibile nella webview");
      await cdp.send("Runtime.evaluate", {
        contextId: target,
        expression: `document.querySelector('#cancel').click()`,
      });
      if (!(await findTarget("#pdf")))
        throw Error("Anteprima verifica non ripristinata dopo Annulla");
      await fs.writeFile(path.join(temp, "ui-done-cancel"), "ok");

      const selectDeadline = Date.now() + 30000;
      while (Date.now() < selectDeadline) {
        try {
          await fs.access(path.join(temp, "ui-ready-select"));
          break;
        } catch {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }
      await fs.access(path.join(temp, "ui-ready-select"));
      target = await findTarget('button[data-variant="seconda"]');
      await fs.mkdir("test-results", { recursive: true });
      if (!target) {
        for (const [i, p] of browser.contexts()[0].pages().entries()) {
          await p.screenshot({ path: `test-results/missing-${i}.png` });
          console.log(
            "PAGE",
            p.url(),
            p.frames().map((f) => f.url()),
          );
        }
        throw Error("Selettore varianti non visibile nella webview");
      }
      await new Promise((r) => setTimeout(r, 1200));
      const css = await cdp.send("Runtime.evaluate", {
        contextId: target,
        expression: `JSON.stringify([...document.querySelectorAll('iframe')].map(f=>({sheets:[...f.contentDocument.styleSheets].map(s=>s.href),links:[...f.contentDocument.querySelectorAll('link')].map(l=>({href:l.href,loaded:!!l.sheet})),math:f.contentDocument.querySelector('.katex-mathml')&&getComputedStyle(f.contentDocument.querySelector('.katex-mathml')).position})))`,
        returnByValue: true,
      });
      console.log("CSS frames", css.result.value);
      const quality = await cdp.send("Runtime.evaluate", {
        contextId: target,
        expression: `JSON.stringify([...document.querySelectorAll('iframe')].map(f=>({images:[...f.contentDocument.images].map(i=>i.complete&&i.naturalWidth>0),math:f.contentDocument.querySelector('.katex-mathml')&&getComputedStyle(f.contentDocument.querySelector('.katex-mathml')).position})))`,
        returnByValue: true,
      });
      const checks = JSON.parse(quality.result.value);
      if (
        !checks.some((c) => c.images.length) ||
        checks.some((c) => c.images.some((ok) => !ok)) ||
        !checks.some((c) => c.math === "absolute")
      )
        throw Error(
          "Immagini o formule non caricate nella webview: " +
            quality.result.value,
        );
      await page.screenshot({ path: "test-results/variant-picker.png" });
      const details = await cdp.send("Runtime.evaluate", {
        contextId: target,
        expression: `JSON.stringify([...document.querySelectorAll('iframe')].map(f=>({height:f.clientHeight,accessible:!!f.contentDocument,fonts:f.contentDocument?.body&&getComputedStyle(f.contentDocument.body).fontFamily})))`,
        returnByValue: true,
      });
      console.log("Variant frames", details.result.value);
      await cdp.send("Runtime.evaluate", {
        contextId: target,
        expression: `document.querySelector('button[data-variant="seconda"]').click()`,
      });
      if (!(await findTarget("#pdf")))
        throw Error("Anteprima verifica non ripristinata dopo la scelta");
      await fs.writeFile(path.join(temp, "ui-done-select"), "ok");
      const waitMarker = async (name) => {
        const deadline = Date.now() + 60000;
        while (Date.now() < deadline) {
          try {
            await fs.access(path.join(temp, name));
            return;
          } catch {
            await new Promise((resolve) => setTimeout(resolve, 100));
          }
        }
        throw Error("Timeout: " + name);
      };
      await waitMarker("ui-ready-random-cancel");
      await page
        .getByText("Mantieni l’ordine del YAML", { exact: true })
        .waitFor();
      await page.keyboard.press("Escape");
      await waitMarker("ui-ready-random-seed");
      await page
        .getByText("Ripeti un riordino usando un seme…", { exact: true })
        .click();
      const input = page.locator(".quick-input-widget input");
      await input.fill("non-valido");
      await page
        .getByText(
          "Il seme deve contenere esattamente 16 caratteri esadecimali (0–9, a–f).",
          { exact: true },
        )
        .waitFor();
      await input.fill("7F3A9C2D84B610EF");
      await page.keyboard.press("Enter");
    } catch (e) {
      await Promise.all([
        fs.writeFile(path.join(temp, "ui-done-cancel"), String(e)),
        fs.writeFile(path.join(temp, "ui-done-select"), String(e)),
      ]);
      throw e;
    } finally {
      cdp?.close();
      await browser?.close();
    }
  };
  const results = await Promise.allSettled([run, ui()]);
  for (const result of results)
    if (result.status === "rejected") throw result.reason;
  await checkStyles();
} finally {
  await fs.rm(temp, {
    recursive: true,
    force: true,
    maxRetries: 10,
    retryDelay: 500,
  });
}
