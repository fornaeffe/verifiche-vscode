import { build } from "esbuild";
import fs from "node:fs/promises";
await fs.mkdir("dist", { recursive: true });
const bundle = await build({
  entryPoints: ["src/extension.ts", "src/cli.ts"],
  bundle: true,
  platform: "node",
  format: "cjs",
  outdir: "dist",
  external: ["vscode", "playwright"],
  sourcemap: true,
  metafile: true,
});
await fs.cp("node_modules/katex/dist", "dist/katex", { recursive: true });
// Playwright uses dynamically loaded modules and browser descriptors.
for (const name of ["playwright", "playwright-core"])
  await fs.cp(`node_modules/${name}`, `dist/node_modules/${name}`, {
    recursive: true,
  });
const packages = new Set(
  Object.keys(bundle.metafile.inputs).flatMap((file) => {
    const m = /(.*node_modules\/(?:@[^/]+\/)?[^/]+)\//.exec(
      file.replaceAll("\\", "/"),
    );
    return m ? [m[1]] : [];
  }),
);
await fs.mkdir("dist/licenses", { recursive: true });
for (const root of packages) {
  const meta = JSON.parse(await fs.readFile(root + "/package.json", "utf8"));
  for (const name of await fs.readdir(root))
    if (/^(license|copying|notice)(\.|$)/i.test(name))
      await fs.copyFile(
        root + "/" + name,
        "dist/licenses/" + meta.name.replaceAll("/", "-") + "-" + name,
      );
}
