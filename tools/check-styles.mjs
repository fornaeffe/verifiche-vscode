import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

// Inspect the real, fully embedded preview documents saved by the Extension Host.
export async function checkStyles(output = path.resolve("test-results")) {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({
      viewport: { width: 1050, height: 1600 },
    });
    const load = async (name) => {
      const html = await fs.readFile(path.join(output, name), "utf8");
      await page.setContent(
        html
          .replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, "")
          .replace(/<meta\b[^>]*http-equiv=[^>]*>/gi, ""),
      );
      const frame = page.frames().find((f) => f !== page.mainFrame());
      assert.ok(frame, "Anteprima iframe assente");
      await frame.locator("body").waitFor();
      await frame.evaluate(() => document.fonts.ready);
      return frame;
    };
    const checkResponses = async (frame) => {
      const positions = await frame
        .locator(".risposta")
        .evaluateAll((responses) =>
          responses.map((response) => {
            const li = response.closest("li");
            const bounds = li.getBoundingClientRect(),
              answer = response.getBoundingClientRect();
            const range = document.createRange();
            range.setStart(li, 0);
            range.setEndBefore(response);
            const text = [...range.getClientRects()];
            return {
              positioned: getComputedStyle(li).position,
              contained:
                answer.left >= bounds.left &&
                answer.right <= bounds.right + 1 &&
                answer.top >= bounds.top - 1,
              overlap: text.some(
                (r) =>
                  r.width > 0 &&
                  r.left < answer.right &&
                  r.right > answer.left + 1 &&
                  r.top < answer.bottom &&
                  r.bottom > answer.top,
              ),
            };
          }),
        );
      assert.ok(positions.length >= 2);
      for (const p of positions) {
        assert.equal(p.positioned, "relative");
        assert.ok(p.contained, "Risposta fuori dalla propria riga");
        assert.equal(p.overlap, false, "Risposta sovrapposta al testo");
      }
    };
    const exam = await load("style-preview.html");
    assert.equal(await exam.locator(".esercizio").count(), 5);
    assert.equal(await exam.locator(".punti").count(), 5);
    assert.equal(await exam.locator(".page-break").count(), 1);
    assert.equal(
      await exam
        .locator(".katex-mathml")
        .first()
        .evaluate((el) => getComputedStyle(el).position),
      "absolute",
    );
    assert.ok(
      await exam
        .locator("img")
        .evaluateAll((images) =>
          images.every((img) => img.complete && img.naturalWidth > 0),
        ),
    );
    assert.equal(
      await exam
        .locator(".sm .opzioni")
        .evaluate((el) => getComputedStyle(el).marginTop),
      "0px",
    );
    assert.ok(
      Math.abs(
        (await exam
          .locator(".sm > p")
          .evaluate((el) => parseFloat(getComputedStyle(el).marginBottom))) -
          96 / 25.4,
      ) < 0.1,
    );
    await checkResponses(exam);
    for (const legacy of [
      "data",
      "vf-grid",
      "vf-testo",
      "vf-etichetta",
      "etichettare-grid",
      "elenco",
      "spazio-dopo",
      "elenco-spaziato",
      "flex",
      "nascosto",
    ]) {
      const styles = await exam.locator("style").allTextContents();
      assert.ok(
        !styles.some((text) =>
          new RegExp("\\." + legacy + "(?=[\\s>{,:])").test(text),
        ),
        `Classe legacy: ${legacy}`,
      );
    }
    await page.locator("iframe").evaluate((el) => {
      el.style.height = el.contentDocument.body.scrollHeight + 60 + "px";
    });
    await page.screenshot({
      path: path.join(output, "style-preview.png"),
      fullPage: true,
    });
    await page.emulateMedia({ media: "print" });
    assert.equal(
      await exam
        .locator(".page-break")
        .evaluate((el) => getComputedStyle(el).breakAfter),
      "page",
    );
    assert.equal(
      await exam
        .locator("body")
        .evaluate((el) => getComputedStyle(el).marginTop),
      "0px",
    );
    // Produce a second PDF from the displayed iframe to compare with the extension export.
    await page.setContent(await exam.content());
    await page.evaluate(() => document.fonts.ready);
    await page.pdf({
      path: path.join(output, "style-preview.pdf"),
      preferCSSPageSize: true,
      printBackground: true,
    });
    await page.emulateMedia({ media: "screen" });
    for (const type of ["A", "SM", "VF", "Etichettare", "Completamento"]) {
      const frame = await load(`style-exercise-${type}.html`);
      if (type === "VF" || type === "Etichettare") await checkResponses(frame);
      if (type === "Completamento")
        assert.ok(
          (await frame
            .locator(".completamento")
            .evaluate((el) => parseFloat(getComputedStyle(el).lineHeight))) >
            20,
        );
    }
    console.log(
      "PASS: Chromium screen/print styles, SM spacing, all exercise previews, long VF/Etichettare answers without overlap, image/math, legacy CSS absent",
    );
  } finally {
    await browser.close();
  }
}
