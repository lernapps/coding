// The program IR v1: a small syntax tree, the same for every world. Blockly produces it (src/ui/blocks.ts), the
// interpreter runs it, and later views (structogram, pseudocode, text) are made from it. Plain JSON.
import { isInt, isObject, type Problem } from "./json.ts";

export type Expr =
  | { e: "num"; value: number }
  /** An empty slot of a block (a "solange" without its question): the program does not run. */
  | { e: "empty" }
  | { e: "var"; name: string }
  | { e: "sense"; name: string; args: Expr[] }
  | { e: "not"; a: Expr }
  | { e: "and" | "or"; a: Expr; b: Expr }
  | { e: "cmp"; op: "<" | "<=" | "=" | "!=" | ">=" | ">"; a: Expr; b: Expr }
  | { e: "arith"; op: "+" | "-" | "*" | "/" | "%"; a: Expr; b: Expr };

/**
 * A statement; `id` is the id of its block in the editor (to highlight it while it runs), ignored otherwise; `locked`
 * (in a start program) keeps the block where it is: it cannot be moved or deleted, only its gaps filled.
 */
export type Stmt = (
  | { s: "cmd"; name: string; args: Expr[] }
  | { s: "repeat"; times: Expr; body: Stmt[] }
  | { s: "while"; cond: Expr; body: Stmt[] }
  | { s: "if"; cond: Expr; then: Stmt[]; else?: Stmt[] }
  | { s: "set"; name: string; value: Expr }
  | { s: "call"; name: string; args: Expr[] }
) & { id?: string; locked?: boolean };

export interface Proc {
  name: string;
  params: string[];
  body: Stmt[];
}

export interface Program {
  main: Stmt[];
  procs?: Proc[];
}

export const EMPTY: Program = { main: [] };

/** At most this many nodes and this depth: a program from a link stays small. */
const MAX_NODES = 500;
const MAX_DEPTH = 24;
const NAME = /^[a-z][a-z0-9-]{0,31}$/;
const CMP = ["<", "<=", "=", "!=", ">=", ">"];
const ARITH = ["+", "-", "*", "/", "%"];

/** Checks a program as it comes from outside; the problems, empty when it is a valid IR v1. */
export function programProblems(value: unknown, path = "program"): Problem[] {
  const problems: Problem[] = [];
  let nodes = 0;
  const bad = (at: string): void => {
    problems.push({ path: at, key: "problem-program" });
  };
  const name = (v: unknown): v is string => typeof v === "string" && NAME.test(v);
  const expr = (v: unknown, at: string, depth: number): void => {
    if (++nodes > MAX_NODES || depth > MAX_DEPTH || !isObject(v)) return bad(at);
    switch (v["e"]) {
      case "num":
        if (typeof v["value"] !== "number" || !Number.isFinite(v["value"])) bad(at);
        return;
      case "empty":
        return;
      case "var":
        if (!name(v["name"])) bad(at);
        return;
      case "sense":
        if (!name(v["name"]) || !Array.isArray(v["args"])) return bad(at);
        (v["args"] as unknown[]).forEach((a, i) => expr(a, `${at}.args[${i}]`, depth + 1));
        return;
      case "not":
        return expr(v["a"], `${at}.a`, depth + 1);
      case "and":
      case "or":
        expr(v["a"], `${at}.a`, depth + 1);
        return expr(v["b"], `${at}.b`, depth + 1);
      case "cmp":
      case "arith":
        if (!(v["e"] === "cmp" ? CMP : ARITH).includes(v["op"] as string)) bad(at);
        expr(v["a"], `${at}.a`, depth + 1);
        return expr(v["b"], `${at}.b`, depth + 1);
      default:
        return bad(at);
    }
  };
  const block = (v: unknown, at: string, depth: number): void => {
    if (!Array.isArray(v)) return bad(at);
    v.forEach((s, i) => stmt(s, `${at}[${i}]`, depth));
  };
  const stmt = (v: unknown, at: string, depth: number): void => {
    if (++nodes > MAX_NODES || depth > MAX_DEPTH || !isObject(v)) return bad(at);
    if (v["locked"] !== undefined && typeof v["locked"] !== "boolean") return bad(`${at}.locked`);
    switch (v["s"]) {
      case "cmd":
      case "call":
        if (!name(v["name"]) || !Array.isArray(v["args"])) return bad(at);
        (v["args"] as unknown[]).forEach((a, i) => expr(a, `${at}.args[${i}]`, depth + 1));
        return;
      case "repeat":
        expr(v["times"], `${at}.times`, depth + 1);
        return block(v["body"], `${at}.body`, depth + 1);
      case "while":
        expr(v["cond"], `${at}.cond`, depth + 1);
        return block(v["body"], `${at}.body`, depth + 1);
      case "if":
        expr(v["cond"], `${at}.cond`, depth + 1);
        block(v["then"], `${at}.then`, depth + 1);
        if (v["else"] !== undefined) block(v["else"], `${at}.else`, depth + 1);
        return;
      case "set":
        if (!name(v["name"])) bad(at);
        return expr(v["value"], `${at}.value`, depth + 1);
      default:
        return bad(at);
    }
  };
  if (!isObject(value)) return [{ path, key: "problem-program" }];
  block(value["main"], `${path}.main`, 0);
  if (value["procs"] !== undefined) {
    if (!Array.isArray(value["procs"])) bad(`${path}.procs`);
    else
      value["procs"].forEach((p: unknown, i: number) => {
        const at = `${path}.procs[${i}]`;
        if (!isObject(p) || !name(p["name"]) || !Array.isArray(p["params"]) || !p["params"].every(name)) return bad(at);
        block(p["body"], `${at}.body`, 1);
      });
  }
  return problems.slice(0, 5);
}

/** The block type of a statement or expression, as the toolbox names it (number literals are fields, not blocks). */
function blockOf(node: Stmt | Expr): string | null {
  if ("s" in node) {
    switch (node.s) {
      case "cmd":
        return node.name;
      case "repeat":
        return "wiederhole";
      case "while":
        return "solange";
      case "if":
        return node.else === undefined ? "wenn" : "wenn-sonst";
      case "set":
        return "setze";
      case "call":
        return "aufruf";
    }
  }
  switch (node.e) {
    case "num":
    case "empty":
      return null;
    case "sense":
      return node.name;
    case "not":
      return "nicht";
    case "var":
      return "variable";
    case "and":
    case "or":
      return node.e === "and" ? "und" : "oder";
    case "cmp":
      return "vergleich";
    case "arith":
      return "rechne";
  }
}

function children(node: Stmt | Expr): (Stmt | Expr)[] {
  if ("s" in node) {
    switch (node.s) {
      case "cmd":
      case "call":
        return node.args;
      case "repeat":
        return [node.times, ...node.body];
      case "while":
        return [node.cond, ...node.body];
      case "if":
        return [node.cond, ...node.then, ...(node.else ?? [])];
      case "set":
        return [node.value];
    }
  }
  switch (node.e) {
    case "sense":
      return node.args;
    case "not":
      return [node.a];
    case "and":
    case "or":
    case "cmp":
    case "arith":
      return [node.a, node.b];
    default:
      return [];
  }
}

/** The blocks a program uses, one entry per block (for `hoechstens-bloecke` and `benutzt-block`). */
export function blocksOf(program: Program): string[] {
  const out: string[] = [];
  const walk = (node: Stmt | Expr): void => {
    const type = blockOf(node);
    if (type !== null) out.push(type);
    children(node).forEach(walk);
  };
  program.main.forEach(walk);
  for (const p of program.procs ?? []) p.body.forEach(walk);
  return out;
}

export { isInt };

/** The block with an empty slot, if any (its toolbox id). */
export function emptySlot(program: Program): string | null {
  let found: string | null = null;
  const walk = (node: Stmt | Expr, owner: string | null): void => {
    if (found !== null) return;
    if ("e" in node && node.e === "empty") {
      found = owner;
      return;
    }
    const type = blockOf(node);
    children(node).forEach((child) => walk(child, type ?? owner));
  };
  program.main.forEach((s) => walk(s, null));
  return found;
}
