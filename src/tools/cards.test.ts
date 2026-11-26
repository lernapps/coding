// The cards to print (public/karten/) are drawn from the block texts: they are the output of scripts/build-cards.ts
// for the texts as they are now (else: npm run build:cards).
/// <reference types="node" />
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vite-plus/test";
import { cards } from "../../scripts/build-cards.ts";

describe("cards to print", () => {
  for (const lang of ["de", "en"] as const)
    for (const [name, svg] of Object.entries(cards(lang)))
      it(`${lang}/${name} is up to date`, () =>
        expect(readFileSync(`public/karten/${lang}/${name}`, "utf8")).toBe(svg));
});
