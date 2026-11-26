// The blocks of the editor (Blockly) and the generator blocks → program IR. Blockly is only the input: it never runs
// code; the core runs the IR. Texts come from the message files; Blockly's own texts from its language packs, with our
// German for those it leaves in English (src/data/blockly-de.json).
import * as Blockly from "blockly/core";
import * as BlocklyDe from "blockly/msg/de";
import * as BlocklyEn from "blockly/msg/en";
import type { Expr, Program, Stmt } from "../../core/ir.ts";
import { WORLDS } from "../../core/worlds/index.ts";
import blocklyDe from "../../data/blockly-de.json";
import { texts, type Key, type Lang } from "../texts.ts";

const COLOURS = { move: 210, control: 120, sense: 290, start: 30 };

/** The number fields of commands with arguments (name → one entry per argument); "colour" is a list of colours. */
const ARGS: Readonly<Record<string, readonly ({ min: number; max: number; value: number } | "colour")[]>> = {
  gehe: [{ min: 1, max: 200, value: 50 }],
  "drehe-links-um": [{ min: 1, max: 360, value: 90 }],
  "drehe-rechts-um": [{ min: 1, max: 360, value: 90 }],
  farbe: ["colour"],
};
const COLOUR_COUNT = 4;
export const START = "programm";

/** Sets Blockly's language and defines the blocks with the texts of `lang`. Call before inject. */
export function setUp(lang: Lang): void {
  const pack = (lang === "en" ? BlocklyEn : BlocklyDe) as unknown as Record<string, string>;
  Blockly.setLocale(lang === "de" ? { ...pack, ...blocklyDe } : pack);
  const { t } = texts(lang);
  const commands = new Set<string>();
  const sensors = new Set<string>();
  for (const versions of Object.values(WORLDS))
    for (const world of Object.values(versions)) {
      Object.keys(world.commands).forEach((c) => commands.add(c));
      Object.keys(world.sensors).forEach((s) => sensors.add(s));
    }
  const label = (name: string): string => t(`block-${name}` as Key);
  Blockly.common.defineBlocksWithJsonArray([
    {
      type: START,
      message0: `${label(START)} %1 %2`,
      args0: [{ type: "input_dummy" }, { type: "input_statement", name: "DO" }],
      colour: COLOURS.start,
      deletable: false,
    },
    ...[...commands].map((name) => ({
      type: name,
      message0: label(name),
      args0: (ARGS[name] ?? []).map((arg, i) =>
        arg === "colour"
          ? {
              type: "field_dropdown",
              name: `A${i}`,
              options: Array.from({ length: COLOUR_COUNT }, (_, c) => [t(`colour-${c + 1}` as Key), String(c + 1)]),
            }
          : { type: "field_number", name: `A${i}`, value: arg.value, min: arg.min, max: arg.max, precision: 1 },
      ),
      previousStatement: null,
      nextStatement: null,
      colour: COLOURS.move,
    })),
    ...[...sensors].map((name) => ({ type: name, message0: label(name), output: "Boolean", colour: COLOURS.sense })),
    {
      type: "wiederhole",
      message0: `${label("wiederhole")} %2 %3`,
      args0: [
        { type: "field_number", name: "N", value: 3, min: 1, max: 99, precision: 1 },
        { type: "input_dummy" },
        { type: "input_statement", name: "DO" },
      ],
      previousStatement: null,
      nextStatement: null,
      colour: COLOURS.control,
    },
    {
      type: "solange",
      message0: `${label("solange")} %2`,
      args0: [
        { type: "input_value", name: "COND", check: "Boolean" },
        { type: "input_statement", name: "DO" },
      ],
      previousStatement: null,
      nextStatement: null,
      colour: COLOURS.control,
    },
    {
      type: "wenn",
      message0: `${label("wenn")} %2`,
      args0: [
        { type: "input_value", name: "COND", check: "Boolean" },
        { type: "input_statement", name: "DO" },
      ],
      previousStatement: null,
      nextStatement: null,
      colour: COLOURS.control,
    },
    {
      type: "wenn-sonst",
      message0: `${label("wenn-sonst")} %2`,
      args0: [
        { type: "input_value", name: "COND", check: "Boolean" },
        { type: "input_statement", name: "DO" },
      ],
      message1: `${label("sonst")} %1`,
      args1: [{ type: "input_statement", name: "ELSE" }],
      previousStatement: null,
      nextStatement: null,
      colour: COLOURS.control,
    },
    {
      type: "nicht",
      message0: label("nicht"),
      args0: [{ type: "input_value", name: "A", check: "Boolean" }],
      output: "Boolean",
      colour: COLOURS.sense,
    },
  ]);
}

/** The toolbox of a challenge: its blocks in categories, or as one list. */
export function toolboxOf(
  blocks: readonly string[],
  lang: Lang,
  categories: boolean,
): Blockly.utils.toolbox.ToolboxDefinition {
  const { t } = texts(lang);
  const item = (type: string): Blockly.utils.toolbox.BlockInfo => ({ kind: "block", type });
  if (!categories) return { kind: "flyoutToolbox", contents: blocks.map(item) };
  const control = ["wiederhole", "solange", "wenn", "wenn-sonst"];
  const groups: [Key, number, string[]][] = [
    [
      "category-move",
      COLOURS.move,
      blocks.filter((b) => !control.includes(b) && Blockly.Blocks[b]?.["output"] === undefined && !isSensor(b)),
    ],
    ["category-control", COLOURS.control, blocks.filter((b) => control.includes(b))],
    ["category-sense", COLOURS.sense, blocks.filter((b) => isSensor(b) || b === "nicht")],
  ];
  return {
    kind: "categoryToolbox",
    contents: groups
      .filter(([, , list]) => list.length > 0)
      .map(([name, colour, list]) => ({
        kind: "category",
        name: t(name),
        colour: String(colour),
        contents: list.map(item),
      })),
  };
}

const isSensor = (type: string): boolean =>
  Object.values(WORLDS).some((versions) => Object.values(versions).some((w) => type in w.sensors));

function expr(block: Blockly.Block | null): Expr {
  if (block === null || !block.isEnabled()) return { e: "empty" };
  if (block.type === "nicht") return { e: "not", a: expr(block.getInputTargetBlock("A")) };
  return { e: "sense", name: block.type, args: [] };
}

function chain(first: Blockly.Block | null): Stmt[] {
  const out: Stmt[] = [];
  for (let b = first; b !== null; b = b.getNextBlock()) {
    if (!b.isEnabled()) continue;
    const id = b.id;
    const body = (name: string): Stmt[] => chain(b?.getInputTargetBlock(name) ?? null);
    switch (b.type) {
      case "wiederhole":
        out.push({ s: "repeat", times: { e: "num", value: Number(b.getFieldValue("N")) }, body: body("DO"), id });
        break;
      case "solange":
        out.push({ s: "while", cond: expr(b.getInputTargetBlock("COND")), body: body("DO"), id });
        break;
      case "wenn":
        out.push({ s: "if", cond: expr(b.getInputTargetBlock("COND")), then: body("DO"), id });
        break;
      case "wenn-sonst":
        out.push({ s: "if", cond: expr(b.getInputTargetBlock("COND")), then: body("DO"), else: body("ELSE"), id });
        break;
      default: {
        const block = b;
        const args = (ARGS[b.type] ?? []).map((_, i): Expr => ({
          e: "num",
          value: Number(block.getFieldValue(`A${i}`)),
        }));
        out.push({ s: "cmd", name: b.type, args, id });
      }
    }
  }
  return out;
}

/** The program: the blocks attached to the start block "Programm". Loose blocks do not run. */
export function programOf(workspace: Blockly.Workspace): Program {
  const start = workspace.getBlocksByType(START, false)[0];
  return { main: chain(start?.getInputTargetBlock("DO") ?? null) };
}

export { Blockly };

type Serial = {
  type: string;
  fields?: Record<string, number>;
  inputs?: Record<string, { block: Serial }>;
  next?: { block: Serial };
};

function serialExpr(e: Expr): Serial | null {
  if (e.e === "sense") return { type: e.name };
  if (e.e === "not") {
    const a = serialExpr(e.a);
    return a === null ? { type: "nicht" } : { type: "nicht", inputs: { A: { block: a } } };
  }
  return null;
}

function serialChain(stmts: readonly Stmt[]): Serial | null {
  let next: Serial | null = null;
  for (let i = stmts.length - 1; i >= 0; i--) {
    const s = stmts[i];
    if (s === undefined) continue;
    const inputs: Record<string, { block: Serial }> = {};
    const put = (name: string, block: Serial | null): void => {
      if (block !== null) inputs[name] = { block };
    };
    let block: Serial;
    switch (s.s) {
      case "repeat":
        block = { type: "wiederhole", fields: { N: s.times.e === "num" ? s.times.value : 1 } };
        put("DO", serialChain(s.body));
        break;
      case "while":
        block = { type: "solange" };
        put("COND", serialExpr(s.cond));
        put("DO", serialChain(s.body));
        break;
      case "if":
        block = { type: s.else === undefined ? "wenn" : "wenn-sonst" };
        put("COND", serialExpr(s.cond));
        put("DO", serialChain(s.then));
        if (s.else !== undefined) put("ELSE", serialChain(s.else));
        break;
      case "cmd": {
        block = { type: s.name };
        const fields: Record<string, number | string> = {};
        s.args.forEach((a, i) => {
          if (a.e === "num") fields[`A${i}`] = ARGS[s.name]?.[i] === "colour" ? String(a.value) : a.value;
        });
        if (Object.keys(fields).length > 0) block.fields = fields as Record<string, number>;
        break;
      }
      default:
        continue;
    }
    if (Object.keys(inputs).length > 0) block.inputs = inputs;
    if (next !== null) block.next = { block: next };
    next = block;
  }
  return next;
}

/** The editor's content for a program: the start block with the program's blocks below it. */
export function workspaceOf(program: Program | null, x = 20): object {
  const body = program === null ? null : serialChain(program.main);
  const start: Serial & { x: number; y: number; deletable: boolean } = { type: START, x, y: 20, deletable: false };
  if (body !== null) start.inputs = { DO: { block: body } };
  return { blocks: { languageVersion: 0, blocks: [start] } };
}
