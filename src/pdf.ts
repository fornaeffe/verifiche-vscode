import fs from "node:fs/promises";
import path from "node:path";
import http from "node:http";
import { chromium } from "playwright";
import { render, safe } from "./core";
import { Snapshot, relativeId } from "./repository";

export async function exportPDF(
  snapshot: Snapshot,
  traces: string[],
  assetRoot: string,
  outputRoot = path.join(snapshot.base, "..", "output"),
) {
  const pages = traces.map((t) => ({
    trace: t,
    ...render(snapshot.exam, t, snapshot.library),
  }));
  const resources = new Map<string, Buffer>();
  const load = async (url: string, file: string) => {
    resources.set(url, await fs.readFile(file));
  };
  await load(
    "/stili/predefinito.css",
    await fs
      .access(path.join(snapshot.base, "..", "stili/predefinito.css"))
      .then(() => path.join(snapshot.base, "..", "stili/predefinito.css"))
      .catch(() => path.join(assetRoot, "../media/predefinito.css")),
  );
  await load(
    "/vendor/katex.min.css",
    path.join(assetRoot, "katex/katex.min.css"),
  );
  for (const p of pages)
    for (const m of p.html.matchAll(
      /(?:src|href)=["'](\/allegati\/[^"']+)["']/g,
    )) {
      await load(
        m[1],
        safe(
          path.join(snapshot.base, "allegati"),
          decodeURIComponent(m[1].slice(10)),
        ),
      );
    }
  // Freeze fonts as well as images and styles before starting the export.
  for (const name of await fs.readdir(path.join(assetRoot, "katex/fonts")))
    await load(
      "/vendor/fonts/" + name,
      path.join(assetRoot, "katex/fonts", name),
    );
  const mime: Record<string, string> = {
    ".css": "text/css",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".svg": "image/svg+xml",
    ".woff2": "font/woff2",
    ".woff": "font/woff",
    ".ttf": "font/ttf",
    ".webp": "image/webp",
    ".gif": "image/gif",
  };
  const server = http.createServer((req, res) => {
    const url = req.url ?? "";
    const page = /^\/page\/(\d+)$/.exec(url);
    if (page && pages[+page[1]]) {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader(
        "Content-Security-Policy",
        "default-src 'none'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'",
      );
      res.end(pages[+page[1]].html);
      return;
    }
    const data = resources.get(url);
    if (!data) {
      res.writeHead(404);
      res.end();
      return;
    }
    res.setHeader(
      "Content-Type",
      mime[path.extname(url)] ?? "application/octet-stream",
    );
    res.end(data);
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  let browser;
  const outputs: string[] = [];
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    const origin = `http://127.0.0.1:${(server.address() as any).port}`;
    await page.route("**/*", (r) =>
      new URL(r.request().url()).origin === origin ? r.continue() : r.abort(),
    );
    for (let i = 0; i < pages.length; i++) {
      await page.goto(origin + "/page/" + i, { waitUntil: "networkidle" });
      await page.evaluate(() => document.fonts.ready);
      const missing = await page
        .locator("img")
        .evaluateAll((imgs) =>
          imgs
            .filter(
              (i) =>
                !(i as HTMLImageElement).complete ||
                !(i as HTMLImageElement).naturalWidth,
            )
            .map((i) => (i as HTMLImageElement).src),
        );
      if (missing.length)
        throw Error("Immagini non caricabili: " + missing.join(", "));
      const id = relativeId(
        path.join(snapshot.base, "verifiche"),
        snapshot.file,
      );
      const file = safe(outputRoot, `${id}/traccia-${pages[i].trace}.pdf`);
      await fs.mkdir(path.dirname(file), { recursive: true });
      const buffer = await page.pdf({
        format: "A4",
        printBackground: true,
        preferCSSPageSize: true,
      });
      await fs.writeFile(file, buffer);
      outputs.push(file);
    }
    return outputs;
  } finally {
    await browser?.close();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}
