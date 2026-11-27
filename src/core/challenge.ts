// A challenge (format 1, public/schemas/challenge.v1.schema.json): a world, a task, the toolbox, limits, test cases and
// checks. This validator follows the schema and is the one the workshop runs (no schema library: those compile code
// with `new Function`); src/core/challenge.test.ts keeps both alike.
import { fitProblems } from "./fits.ts";
import { blocksOf, emptySlot, programProblems, type Program } from "./ir.ts";
import { runToEnd, type Run } from "./interpreter.ts";
import { isInt, isObject, type Json, type Msg, type Problem } from "./json.ts";
import { predictionProblems } from "./prediction.ts";
import { newestVersion, worldOf, WORLDS } from "./worlds/index.ts";
import type { World } from "./worlds/types.ts";

export type Text = { de: string; en?: string };
export interface Challenge {
  format: 1;
  id: string;
  title: Text;
  task: Text;
  world: { type: string; version: number; config: Json };
  toolbox: string[];
  start: Program | null;
  limits: { blocks?: number; steps?: number };
  tests: { config: Json }[];
  checks: string[];
  hints: Text[];
  view: "bloecke";
  back?: { url: string | Text; label: Text };
  /** With the check "vorhersage" in a turtle world: the programs of the wrong pictures to choose from. */
  vorhersage?: { bilder: Program[] };
}

export const LANGUAGES = ["de", "en"] as const;
export const MAX_LINK = 2000;
export const DEFAULT_STEPS = 1000;
/** Blocks of the workshop, in every world. */
export const CONTROL_BLOCKS = ["wiederhole", "solange", "wenn", "wenn-sonst", "nicht"];
const ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;
/** A path on lernapps.net, with an optional query; no fragment (the workshop adds #werkstatt=…). */
export const BACK_URL = /^\/[a-z0-9/-]*\/(\?[a-z0-9=&-]*)?$/;
const KEYS = [
  "format",
  "id",
  "title",
  "task",
  "world",
  "toolbox",
  "start",
  "limits",
  "tests",
  "checks",
  "hints",
  "view",
  "back",
  "vorhersage",
];
const WORKSHOP_CHECKS = ["hoechstens-bloecke", "vorhersage"];

function textProblems(value: unknown, path: string, max: number): Problem[] {
  if (!isObject(value)) return [{ path, key: "problem-text" }];
  const problems: Problem[] = [];
  if (typeof value["de"] !== "string") problems.push({ path: `${path}.de`, key: "problem-text-german" });
  for (const [lang, text] of Object.entries(value)) {
    if (!(LANGUAGES as readonly string[]).includes(lang))
      problems.push({ path: `${path}.${lang}`, key: "problem-language" });
    else if (typeof text !== "string" || text.trim() === "" || text.length > max)
      problems.push({ path: `${path}.${lang}`, key: "problem-text-length", params: { max } });
  }
  return problems;
}

/** The config of test case `i` (or of the world itself with -1): the test's fields laid over the world's. */
export function configOf(c: Challenge, i: number): Json {
  const base = isObject(c.world.config) ? c.world.config : {};
  const test = i < 0 ? undefined : c.tests[i]?.config;
  return { ...base, ...(isObject(test) ? test : {}) } as Json;
}

/** The test cases: the world's own config first, then each test case. */
export const testCount = (c: Challenge): number => 1 + c.tests.length;
export const configAt = (c: Challenge, n: number): Json => configOf(c, n - 2);

/** Problems of a challenge from outside; empty when it is valid. */
export function challengeProblems(value: unknown): Problem[] {
  if (!isObject(value)) return [{ path: "", key: "problem-not-object" }];
  const p: Problem[] = [];
  for (const key of Object.keys(value)) if (!KEYS.includes(key)) p.push({ path: key, key: "problem-unknown-field" });
  if (value["format"] !== 1) p.push({ path: "format", key: "problem-format" });
  if (typeof value["id"] !== "string" || !ID.test(value["id"]) || value["id"].length > 64)
    p.push({ path: "id", key: "problem-id" });
  p.push(...textProblems(value["title"], "title", 80), ...textProblems(value["task"], "task", 400));
  const w = value["world"];
  let world: World | undefined;
  if (!isObject(w) || typeof w["type"] !== "string" || !(w["type"] in WORLDS)) {
    p.push({ path: "world.type", key: "problem-world-type" });
  } else if (!isInt(w["version"], 1, 1000) || worldOf(w["type"], w["version"]) === undefined) {
    p.push({ path: "world.version", key: "problem-world-version", params: { newest: newestVersion(w["type"]) } });
  } else {
    world = worldOf(w["type"], w["version"]);
    p.push(...(world?.configProblems(w["config"], "world.config") ?? []));
  }
  const known =
    world === undefined ? [] : [...CONTROL_BLOCKS, ...Object.keys(world.commands), ...Object.keys(world.sensors)];
  const toolbox = value["toolbox"];
  if (!Array.isArray(toolbox) || toolbox.length < 1 || toolbox.length > 30)
    p.push({ path: "toolbox", key: "problem-toolbox" });
  else
    toolbox.forEach((b: unknown, i: number) => {
      if (world !== undefined && (typeof b !== "string" || !known.includes(b)))
        p.push({ path: `toolbox[${i}]`, key: "problem-block", params: { name: String(b) } });
    });
  if (value["start"] !== null && value["start"] !== undefined) {
    const syntax = programProblems(value["start"], "start");
    p.push(...syntax);
    if (syntax.length === 0 && world !== undefined) p.push(...fitProblems(value["start"] as Program, world, "start"));
  }
  const limits = value["limits"];
  if (!isObject(limits)) p.push({ path: "limits", key: "problem-limits" });
  else {
    for (const key of Object.keys(limits))
      if (key !== "blocks" && key !== "steps") p.push({ path: `limits.${key}`, key: "problem-unknown-field" });
    if (limits["blocks"] !== undefined && !isInt(limits["blocks"], 1, 200))
      p.push({ path: "limits.blocks", key: "problem-limits" });
    if (limits["steps"] !== undefined && !isInt(limits["steps"], 1, 10_000))
      p.push({ path: "limits.steps", key: "problem-limits" });
  }
  const tests = value["tests"];
  if (!Array.isArray(tests) || tests.length > 9) p.push({ path: "tests", key: "problem-tests" });
  else if (world !== undefined && isObject(w))
    tests.forEach((t: unknown, i: number) => {
      if (!isObject(t) || !isObject(t["config"]) || Object.keys(t).length !== 1) {
        p.push({ path: `tests[${i}]`, key: "problem-tests" });
        return;
      }
      const merged = { ...(isObject(w["config"]) ? w["config"] : {}), ...t["config"] };
      p.push(...(world?.configProblems(merged, `tests[${i}].config`) ?? []));
    });
  const checks = value["checks"];
  if (!Array.isArray(checks) || checks.length < 1) p.push({ path: "checks", key: "problem-checks" });
  else
    checks.forEach((c: unknown, i: number) => {
      const ok =
        typeof c === "string" &&
        (WORKSHOP_CHECKS.includes(c) ||
          (world !== undefined && c in world.checks) ||
          (c.startsWith("benutzt-block:") && known.includes(c.slice(14))));
      if (world !== undefined && !ok)
        p.push({ path: `checks[${i}]`, key: "problem-check", params: { name: String(c) } });
    });
  const hints = value["hints"];
  if (!Array.isArray(hints) || hints.length > 3) p.push({ path: "hints", key: "problem-hints" });
  else hints.forEach((h: unknown, i: number) => p.push(...textProblems(h, `hints[${i}]`, 200)));
  if (value["view"] !== "bloecke") p.push({ path: "view", key: "problem-view" });
  const back = value["back"];
  if (back !== undefined) {
    const url = isObject(back) ? back["url"] : undefined;
    const urls = typeof url === "string" ? [url] : isObject(url) ? Object.values(url) : [];
    const langs = isObject(url) ? Object.keys(url) : ["de"];
    if (
      !isObject(back) ||
      urls.length === 0 ||
      !urls.every((u) => typeof u === "string" && BACK_URL.test(u)) ||
      !langs.includes("de") ||
      !langs.every((l) => (LANGUAGES as readonly string[]).includes(l))
    )
      p.push({ path: "back.url", key: "problem-back-url" });
    else p.push(...textProblems(back["label"], "back.label", 60));
  }
  p.push(...predictionProblems(value, world, p.length === 0));
  return p;
}

export interface TestResult {
  ok: boolean;
  /** Why not, for the learner. */
  why?: Msg;
}

/** Checks a finished run of test case `n` against the challenge's world checks. */
export function judgeRun(c: Challenge, world: World, n: number, run: Run): TestResult {
  if (run.status !== "done") return { ok: false, why: run.why ?? { key: "fail-limit", params: { steps: run.steps } } };
  const config = configAt(c, n);
  for (const name of c.checks) {
    const check = world.checks[name];
    if (check === undefined) continue;
    const verdict = check(run.world, config);
    if (!verdict.ok) return { ok: false, why: verdict.why };
  }
  return { ok: true };
}

/** The checks of the program itself (before any run): at most so many blocks, uses a block. */
export function programVerdict(c: Challenge, program: Program): Msg | null {
  const blocks = blocksOf(program);
  if (blocks.length === 0) return { key: "fail-empty" };
  const slot = emptySlot(program);
  if (slot !== null) return { key: "fail-empty-slot", params: { block: slot } };
  const max = c.limits.blocks;
  if (max !== undefined && blocks.length > max)
    return { key: "fail-too-many-blocks", params: { used: blocks.length, max } };
  for (const check of c.checks)
    if (check.startsWith("benutzt-block:") && !blocks.includes(check.slice(14)))
      return { key: "fail-missing-block", params: { block: check.slice(14) } };
  return null;
}

/** Runs the program on every test case; the first that fails, or null when all pass. */
export function firstFailure(c: Challenge, program: Program): { test: number; why: Msg; run?: Run } | null {
  const world = worldOf(c.world.type, c.world.version);
  if (world === undefined) return { test: 1, why: { key: "problem-world-version", params: { newest: 0 } } };
  const pre = programVerdict(c, program);
  if (pre !== null) return { test: 0, why: pre };
  for (let n = 1; n <= testCount(c); n++) {
    const run = runToEnd(program, world, configAt(c, n), c.limits.steps ?? DEFAULT_STEPS);
    const result = judgeRun(c, world, n, run);
    if (!result.ok) return { test: n, why: result.why ?? { key: "fail-limit" }, run };
  }
  return null;
}
