import crypto from "node:crypto";

export interface PDFOrder {
  seed?: string;
}

export function normalizeSeed(value: string) {
  const seed = value.trim().toLowerCase();
  if (!/^[0-9a-f]{16}$/.test(seed))
    throw Error(
      "Il seme deve contenere esattamente 16 caratteri esadecimali (0–9, a–f).",
    );
  return seed;
}

export const newSeed = () => crypto.randomBytes(8).toString("hex");

export function hasRandomGroups(blocks: any[]): boolean {
  return blocks.some(
    (b) =>
      b.gruppo &&
      (b.gruppo.ordine_casuale === true || hasRandomGroups(b.gruppo.esercizi)),
  );
}

// v1: keep this stream stable so saved seeds remain reproducible.
// Each group uses its ORIGINAL path, independently of its parent's permutation.
export function orderForTrace(exam: any, trace: string, seed: string) {
  seed = normalizeSeed(seed);
  const walk = (blocks: any[], parent: (string | number)[]): any[] =>
    blocks.map((block, index) => {
      if (!block.gruppo) return block;
      const path = [...parent, index, "gruppo"];
      const children = walk(block.gruppo.esercizi, [...path, "esercizi"]);
      if (block.gruppo.ordine_casuale === true) {
        let counter = 0;
        const pick = (size: number) => {
          // Rejection sampling avoids modulo bias in Fisher–Yates.
          const limit = Math.floor(0x100000000 / size) * size;
          let value: number;
          do {
            value = crypto
              .createHash("sha256")
              .update(
                JSON.stringify([
                  "verifiche-ordine-v1",
                  seed,
                  trace,
                  path,
                  counter++,
                ]),
              )
              .digest()
              .readUInt32BE(0);
          } while (value >= limit);
          return value % size;
        };
        for (let i = children.length - 1; i > 0; i--) {
          const j = pick(i + 1);
          [children[i], children[j]] = [children[j], children[i]];
        }
      }
      return { ...block, gruppo: { ...block.gruppo, esercizi: children } };
    });
  return { ...exam, blocchi: walk(exam.blocchi, ["blocchi"]) };
}

export function pdfFilename(trace: string, seed?: string) {
  return `traccia-${trace}${seed === undefined ? "" : ".seme-" + normalizeSeed(seed)}.pdf`;
}
