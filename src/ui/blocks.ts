// Spike: Blöcke der Welt Labyrinth und der Generator Blöcke → IR (JSON). Kein JavaScript aus Blöcken.
import * as Blockly from "blockly/core";
import * as De from "blockly/msg/de";
import * as En from "blockly/msg/en";
import type { Stmt } from "../core/index.ts";

const TEXTS = {
  de: {
    vorwaerts: "gehe vorwärts",
    links: "drehe links",
    rechts: "drehe rechts",
    wiederhole: "wiederhole %1 mal %2 %3",
    solange: "solange vorne frei tue %1 %2",
  },
  en: {
    vorwaerts: "move forward",
    links: "turn left",
    rechts: "turn right",
    wiederhole: "repeat %1 times %2 %3",
    solange: "while path ahead do %1 %2",
  },
};

/** Sprache für Blockly und die eigenen Blöcke; vor inject aufrufen. */
export function setLanguage(lang: string): void {
  const l = lang === "en" ? "en" : "de";
  Blockly.setLocale((l === "en" ? En : De) as unknown as Record<string, string>);
  const m = TEXTS[l];
  define(m);
}

function define(m: (typeof TEXTS)["de"]): void {
  Blockly.common.defineBlocksWithJsonArray([
    { type: "vorwaerts", message0: m.vorwaerts, previousStatement: null, nextStatement: null, colour: 210 },
    { type: "links", message0: m.links, previousStatement: null, nextStatement: null, colour: 210 },
    { type: "rechts", message0: m.rechts, previousStatement: null, nextStatement: null, colour: 210 },
    {
      type: "wiederhole",
      message0: m.wiederhole,
      args0: [
        { type: "field_number", name: "N", value: 3, min: 0, max: 20, precision: 1 },
        { type: "input_dummy" },
        { type: "input_statement", name: "DO" },
      ],
      previousStatement: null,
      nextStatement: null,
      colour: 120,
    },
    {
      type: "solange_frei",
      message0: m.solange,
      args0: [{ type: "input_dummy" }, { type: "input_statement", name: "DO" }],
      previousStatement: null,
      nextStatement: null,
      colour: 120,
    },
  ]);
}

export const toolbox = {
  kind: "flyoutToolbox",
  contents: ["vorwaerts", "links", "rechts", "wiederhole", "solange_frei"].map((type) => ({ kind: "block", type })),
};

function chain(block: Blockly.Block | null): Stmt[] {
  const out: Stmt[] = [];
  for (let b = block; b !== null; b = b.getNextBlock()) {
    if (b.isEnabled() === false) continue;
    switch (b.type) {
      case "vorwaerts":
      case "links":
      case "rechts":
        out.push({ op: "cmd", name: b.type });
        break;
      case "wiederhole":
        out.push({ op: "repeat", n: Number(b.getFieldValue("N")), body: chain(b.getInputTargetBlock("DO")) });
        break;
      case "solange_frei":
        out.push({ op: "while", cond: "frei", body: chain(b.getInputTargetBlock("DO")) });
        break;
    }
  }
  return out;
}

/** Das Programm: der oberste Stapel, der mit dem Startblock beginnt; im Spike der erste Stapel. */
export function toIR(ws: Blockly.Workspace): Stmt[] {
  const top = ws.getTopBlocks(true)[0] ?? null;
  return chain(top);
}

export { Blockly };
