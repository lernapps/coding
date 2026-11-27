// Predictions (check "vorhersage"): the program is given and fixed, the learner predicts what Kiko does, then the run
// shows it. Labyrinth: the fields Kiko goes through, in order (a step is a change of field; turns do not count).
// Turtle: one of several pictures; the right one is the run of the program, the wrong ones are programs of the author
// (`vorhersage.bilder`), shown in an order drawn from the seed. The verdict names the first step where prediction
// and run part.
import { configAt, testCount, type Challenge, type TestResult } from "./challenge.ts";
import { fitProblems } from "./fits.ts";
import { runToEnd, type Run } from "./interpreter.ts";
import { blocksOf, programProblems, type Program, type Stmt } from "./ir.ts";
import { isObject, type Json, type Msg, type Problem } from "./json.ts";
import { worldOf } from "./worlds/index.ts";
import type { LabyrinthConfig, LabyrinthState } from "./worlds/labyrinth.ts";
import { MAX_TARGET_LINES, type Line, type TurtleState } from "./worlds/turtle.ts";
import type { World } from "./worlds/types.ts";

export const PREDICTION = "vorhersage";
/** Labyrinth: the fields predicted, as "x,y" from 0 (as the trail of the world); turtle: the picture chosen (0 …). */
export type Prediction = string[] | number | null;
/** The most fields of a predicted way. */
export const MAX_FIELDS = 100;
/** Points of a line closer than this are the same (as the check "bild-gleich"). */
const TOLERANCE = 2;

export const isPrediction = (c: Challenge | null): boolean => c !== null && c.checks.includes(PREDICTION);

/** The fields of the run after the start, as "x,y" from 0. */
const way = (run: Run): string[] => ((run.world as unknown as LabyrinthState).trail ?? []).slice(1);
/** The lines of a picture, without lines of length 0. */
const linesOf = (run: Run): Line[] =>
  ((run.world as unknown as TurtleState).lines ?? []).filter((l) => l[0] !== l[2] || l[1] !== l[3]);
const field = (key: string): { x: number; y: number } => {
  const [x, y] = key.split(",").map(Number);
  return { x: (x ?? 0) + 1, y: (y ?? 0) + 1 };
};
const point = (v: number): number => Math.round(v);

/** The program with an id on every statement ("b1", "b2", … in reading order), so the block that ran can be shown. */
export function numbered(program: Program): Program {
  let n = 0;
  const walk = (body: readonly Stmt[]): Stmt[] =>
    body.map((s) => {
      const id = `b${++n}`;
      switch (s.s) {
        case "repeat":
        case "while":
          return { ...s, id, body: walk(s.body) };
        case "if":
          return { ...s, id, then: walk(s.then), ...(s.else === undefined ? {} : { else: walk(s.else) }) };
        default:
          return { ...s, id };
      }
    });
  return { ...program, main: walk(program.main) };
}

/** The run of the challenge's program on test case `n`. */
export function runOf(c: Challenge, n: number, program: Program | null = c.start): Run | null {
  const world = worldOf(c.world.type, c.world.version);
  if (world === undefined || program === null) return null;
  return runToEnd(program, world, configAt(c, n), c.limits.steps ?? 1000);
}

/** A permutation of 0 … count-1 drawn from the seed and the test case (mulberry32). */
export function orderOf(count: number, seed: number, n: number): number[] {
  let a = (Math.imul(seed | 0, 31) + n * 7919) | 0;
  const random = (): number => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const order = Array.from({ length: count }, (_, i) => i);
  for (let i = count - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j] ?? 0, order[i] ?? 0];
  }
  return order;
}

/** The pictures to choose from on test case `n`, in the order shown: the run of the program and the wrong ones. */
export function picturesOf(c: Challenge, n: number, seed: number): Line[][] {
  const programs = [c.start, ...(c.vorhersage?.bilder ?? [])];
  const all = programs.map((p) => {
    const run = runOf(c, n, p);
    return run === null ? [] : linesOf(run);
  });
  return orderOf(all.length, seed, n).map((i) => all[i] ?? []);
}

/** The test case whose prediction is missing, as a verdict; null when every test case has one. */
export function missingPrediction(c: Challenge, predictions: readonly Prediction[]): { test: number; why: Msg } | null {
  for (let n = 1; n <= testCount(c); n++) {
    const p = predictions[n - 1] ?? null;
    if (p === null || (Array.isArray(p) && p.length === 0))
      return { test: n, why: { key: c.world.type === "turtle" ? "fail-predict-no-picture" : "fail-predict-no-way" } };
  }
  return null;
}

/** Compares the way Kiko went with the predicted fields. */
function compareWay(run: Run, predicted: readonly string[]): TestResult {
  const went = way(run);
  const i = went.findIndex((f, k) => predicted[k] !== f);
  const at = i < 0 ? (predicted.length > went.length ? went.length : -1) : i;
  if (at < 0) return { ok: true };
  const ok = { ok: at };
  const kiko = went[at];
  const yours = predicted[at];
  if (kiko !== undefined && yours !== undefined) {
    const k = field(kiko);
    const y = field(yours);
    return {
      ok: false,
      why: {
        key: at === 0 ? "fail-predict-step-first" : "fail-predict-step",
        params: { ...ok, step: at + 1, x: k.x, y: k.y, px: y.x, py: y.y },
      },
    };
  }
  if (kiko !== undefined)
    return { ok: false, why: { key: "fail-predict-more", params: { ...ok, step: at + 1, ...field(kiko) } } };
  const end = field(went.at(-1) ?? (run.world as unknown as LabyrinthState).trail[0] ?? "0,0");
  const next = field(yours ?? "0,0");
  // A run without any step: Kiko stays where it started.
  const key = went.length === 0 ? "fail-predict-less-none" : "fail-predict-less";
  return { ok: false, why: { key, params: { ...ok, ...end, px: next.x, py: next.y } } };
}

const near = (a: Line, b: Line): boolean =>
  Math.hypot(a[0] - b[0], a[1] - b[1]) <= TOLERANCE && Math.hypot(a[2] - b[2], a[3] - b[3]) <= TOLERANCE;

/** Compares the lines Kiko drew with the lines of the picture chosen. */
function comparePicture(run: Run, chosen: readonly Line[]): TestResult {
  const drawn = linesOf(run);
  const i = drawn.findIndex((l, k) => chosen[k] === undefined || !near(l, chosen[k]));
  const at = i < 0 ? (chosen.length > drawn.length ? drawn.length : -1) : i;
  if (at < 0) return { ok: true };
  const kiko = drawn[at];
  const yours = chosen[at];
  const ends = (l: Line): Record<string, number> => ({
    x1: point(l[0]),
    y1: point(l[1]),
    x2: point(l[2]),
    y2: point(l[3]),
  });
  if (kiko !== undefined && yours !== undefined)
    return {
      ok: false,
      why: {
        key: at === 0 ? "fail-predict-line-first" : "fail-predict-line",
        params: { ok: at, line: at + 1, ...ends(kiko), px: point(yours[2]), py: point(yours[3]) },
      },
    };
  if (kiko !== undefined)
    return { ok: false, why: { key: "fail-predict-line-more", params: { ok: at, line: at + 1, ...ends(kiko) } } };
  return { ok: false, why: { key: "fail-predict-line-less", params: { ok: at, lines: drawn.length } } };
}

/**
 * While the run goes on: the first step (or line) where it already left the prediction, judged at once, so that Kiko
 * stops there and the rest of the right answer stays hidden; null while both agree so far.
 */
export function partedEarly(
  c: Challenge,
  n: number,
  run: Run,
  prediction: Prediction,
  seed: number,
): TestResult | null {
  if (Array.isArray(prediction)) {
    const went = way(run);
    return went.some((f, k) => prediction[k] !== f) ? compareWay(run, prediction) : null;
  }
  if (typeof prediction === "number") {
    const chosen = picturesOf(c, n, seed)[prediction] ?? [];
    const drawn = linesOf(run);
    return drawn.some((l, k) => chosen[k] === undefined || !near(l, chosen[k])) ? comparePicture(run, chosen) : null;
  }
  return null;
}

/** Judges a finished run of test case `n` against the learner's prediction. */
export function judgePrediction(c: Challenge, n: number, run: Run, prediction: Prediction, seed: number): TestResult {
  if (run.status !== "done") return { ok: false, why: run.why ?? { key: "fail-limit", params: { steps: run.steps } } };
  if (Array.isArray(prediction)) return compareWay(run, prediction);
  if (typeof prediction === "number") return comparePicture(run, picturesOf(c, n, seed)[prediction] ?? []);
  return { ok: false, why: { key: c.world.type === "turtle" ? "fail-predict-no-picture" : "fail-predict-no-way" } };
}

/** The way with one more field, when it is a free field next to the last one (or next to the start); else null. */
export function withField(c: Challenge, n: number, predicted: readonly string[], key: string): string[] | null {
  const world = worldOf(c.world.type, c.world.version);
  if (world === undefined || c.world.type !== "labyrinth" || predicted.length >= MAX_FIELDS) return null;
  const config = configAt(c, n) as unknown as LabyrinthConfig;
  const m = /^(\d+),(\d+)$/.exec(key);
  if (m === null) return null;
  const x = Number(m[1]);
  const y = Number(m[2]);
  const row = config.map[y];
  if (row === undefined || x >= row.length || row[x] === "#") return null;
  const last = predicted.at(-1) ?? (world.start(config as unknown as Json) as unknown as LabyrinthState).trail[0];
  const [lx, ly] = (last ?? "").split(",").map(Number);
  if (Math.abs(x - (lx ?? -9)) + Math.abs(y - (ly ?? -9)) !== 1) return null;
  return [...predicted, `${x},${y}`];
}

/** Problems of a challenge with the check "vorhersage" (after the general checks found none in its parts). */
export function predictionProblems(
  value: Record<string, unknown>,
  world: World | undefined,
  valid: boolean,
): Problem[] {
  const checks = Array.isArray(value["checks"]) ? (value["checks"] as unknown[]) : [];
  const field = value["vorhersage"];
  if (!checks.includes(PREDICTION))
    return field === undefined ? [] : [{ path: "vorhersage", key: "problem-predict-field" }];
  const p: Problem[] = [];
  if (checks.length !== 1) p.push({ path: "checks", key: "problem-predict-checks" });
  const start = value["start"];
  if (
    start === null ||
    start === undefined ||
    programProblems(start).length > 0 ||
    blocksOf(start as Program).length === 0
  )
    return [...p, { path: "start", key: "problem-predict-start" }];
  if (world === undefined) return p;
  if (world.id === "turtle") {
    const bilder = isObject(field) ? field["bilder"] : undefined;
    if (
      !isObject(field) ||
      Object.keys(field).some((k) => k !== "bilder") ||
      !Array.isArray(bilder) ||
      bilder.length < 2 ||
      bilder.length > 3
    )
      return [...p, { path: "vorhersage", key: "problem-predict-pictures" }];
    bilder.forEach((b: unknown, i: number) => {
      const syntax = programProblems(b, `vorhersage.bilder[${i}]`);
      p.push(...(syntax.length > 0 ? syntax : fitProblems(b as Program, world, `vorhersage.bilder[${i}]`)));
    });
  } else if (field !== undefined) p.push({ path: "vorhersage", key: "problem-predict-field" });
  if (p.length > 0 || !valid) return p;
  // Every test case: the program runs to its end (a learner cannot predict a crash), and no wrong picture is the right
  // one (nor too big).
  const c = value as unknown as Challenge;
  for (let n = 1; n <= testCount(c); n++) {
    const run = runOf(c, n);
    if (run === null || run.status !== "done") {
      p.push({ path: "start", key: "problem-predict-run", params: { n } });
      continue;
    }
    if (world.id !== "turtle") continue;
    (c.vorhersage?.bilder ?? []).forEach((b, i) => {
      const wrong = runOf(c, n, b);
      if (wrong === null || wrong.status !== "done" || linesOf(wrong).length > MAX_TARGET_LINES)
        p.push({ path: `vorhersage.bilder[${i}]`, key: "problem-target-lines", params: { max: MAX_TARGET_LINES } });
      else if (comparePicture(run, linesOf(wrong)).ok)
        p.push({ path: `vorhersage.bilder[${i}]`, key: "problem-predict-same", params: { n } });
    });
  }
  return p;
}
