// The core of the workshop (contract of @lernapps/app-templates/interactive): the challenge, the learner's program as
// IR, and the run of it on the test case shown. Pure TypeScript, the state plain JSON. Blockly is only the input: the
// UI sends the program as the action "programm".
import type { Input, Json, Params } from "@lernapps/app-templates/interactive";
import { unpack } from "./inflate.ts";
import {
  challengeProblems,
  configAt,
  MAX_LINK,
  judgeRun,
  programVerdict,
  testCount,
  type Challenge,
} from "./challenge.ts";
import { advance, begin, type Run } from "./interpreter.ts";
import { blocksOf, EMPTY, programProblems, type Program } from "./ir.ts";
import type { Msg, Problem } from "./json.ts";
import {
  isPrediction,
  judgePrediction,
  missingPrediction,
  picturesOf,
  withField,
  type Prediction,
} from "./prediction.ts";
import { worldOf } from "./worlds/index.ts";
import { BUILT_IN, ROUTES } from "../data/index.ts";

export type Phase = "edit" | "running" | "paused" | "done";
export interface Verdict {
  ok: boolean;
  /** The test case that failed (0: the program itself, before any run). */
  test: number;
  why?: Msg;
}

export interface State {
  seed: number;
  /** Where the challenge came from: a route of the built-in collection, or the address (?c=). */
  source: "route" | "address";
  challenge: Challenge | null;
  /** Why the challenge from the address (or the draft) cannot run. */
  problems: Problem[];
  /** The authoring page (route "autoren"): the draft as text; null elsewhere. Kept while the draft is tried out. */
  draft: string | null;
  program: Program;
  blocks: number;
  /** The test case shown, from 1. */
  test: number;
  run: Run | null;
  phase: Phase;
  verdict: Verdict | null;
  /** Per test case (puzzle) of the last start: passed, failed, or not run yet. */
  results: ("ok" | "fail" | null)[];
  /** Starts with a verdict: a start runs every test case in turn and counts once. */
  attempts: number;
  solved: boolean;
  /** With the check "vorhersage": the learner's prediction per test case (fields or the picture chosen). */
  predictions: Prediction[];
  hints: number;
  /** 1 (slow) to 5 (fast). */
  tempo: number;
  clock: number;
}

/** Ticks (20 ms each) per command, by tempo. */
export const TEMPO_TICKS = [0, 40, 25, 15, 8, 3] as const;
export const DEFAULT_TEMPO = 3;

function fresh(seed: number, source: State["source"], challenge: Challenge | null, problems: Problem[] = []): State {
  const program = challenge?.start ?? EMPTY;
  return {
    seed,
    source,
    challenge,
    problems,
    draft: null,
    program,
    blocks: blocksOf(program).length,
    test: 1,
    run: null,
    phase: "edit",
    verdict: null,
    results: [],
    attempts: 0,
    solved: false,
    predictions: [],
    hints: 0,
    tempo: DEFAULT_TEMPO,
    clock: 0,
  };
}

/** The route of the authoring page. */
export const AUTHORING = "autoren";
const EXAMPLE = JSON.stringify(BUILT_IN["labyrinth-2"] ?? null, null, 2);

/** The challenge of the address (`?c=`, way A): checked, else the reasons why it cannot run. */
function fromAddress(seed: number, c: string): State {
  if (c.length > MAX_LINK)
    return fresh(seed, "address", null, [{ path: "", key: "problem-too-long", params: { max: MAX_LINK } }]);
  let value: unknown;
  try {
    value = unpack(c);
  } catch {
    return fresh(seed, "address", null, [{ path: "", key: "problem-unreadable" }]);
  }
  const problems = challengeProblems(value);
  return problems.length > 0 ? fresh(seed, "address", null, problems) : fresh(seed, "address", value as Challenge);
}

/** A route of the collection, the authoring page, or (an unknown id) the first route. */
function fromRoute(seed: number, route: string): State {
  if (route === AUTHORING) return { ...fresh(seed, "route", null), draft: EXAMPLE };
  return fresh(seed, "route", BUILT_IN[route] ?? BUILT_IN[ROUTES[0] ?? ""] ?? null);
}

/**
 * Starts with the challenge of the address when it has one (`c`), else with the route. The parameters hold for the
 * whole visit: a new route starts the same challenge of the address again (the UI leaves it by a new visit).
 */
export function start(seed: number, route: string, params: Params = {}): State {
  const c = params["c"];
  return c === undefined ? fromRoute(seed, route) : fromAddress(seed, c);
}

/** The problems of a draft: not JSON, or not a valid challenge. */
function draftProblems(text: string): Problem[] {
  try {
    return challengeProblems(JSON.parse(text) as unknown);
  } catch {
    return [{ path: "", key: "problem-json" }];
  }
}

const worldFor = (c: Challenge) => worldOf(c.world.type, c.world.version);

/** The run of the shown test case, begun. */
function begun(state: State, c: Challenge): State {
  const world = worldFor(c);
  if (world === undefined) return state;
  return { ...state, run: begin(state.program, world, configAt(c, state.test)), clock: 0 };
}

/**
 * After a step of the run: once it ended, its test case is judged. Passed: the next test case begins at once (one start
 * runs them all in turn); the last one passed: solved. Failed: the verdict names it, and its picture stays shown.
 */
function settle(state: State, c: Challenge): State {
  const run = state.run;
  const world = worldFor(c);
  if (run === null || world === undefined || run.status === "running") return state;
  const result = isPrediction(c)
    ? judgePrediction(c, state.test, run, state.predictions[state.test - 1] ?? null, state.seed)
    : judgeRun(c, world, state.test, run);
  const results = Array.from({ length: testCount(c) }, (_, i) => state.results[i] ?? null);
  results[state.test - 1] = result.ok ? "ok" : "fail";
  if (!result.ok) {
    const why = result.why === undefined ? {} : { why: result.why };
    return {
      ...state,
      results,
      attempts: state.attempts + 1,
      phase: "done",
      verdict: { ok: false, test: state.test, ...why },
    };
  }
  if (state.test < testCount(c)) return begun({ ...state, results, test: state.test + 1 }, c);
  return {
    ...state,
    results,
    attempts: state.attempts + 1,
    phase: "done",
    verdict: { ok: true, test: state.test },
    solved: true,
  };
}

function stepRun(state: State, c: Challenge): State {
  const world = worldFor(c);
  if (state.run === null || world === undefined) return state;
  const run = advance(state.run, state.program, world, configAt(c, state.test), c.limits.steps ?? 1000);
  return settle({ ...state, run }, c);
}

/** Starts a run: the program's own checks first (block limit), then the shown test case. */
function launch(state: State, c: Challenge, phase: Phase): State {
  // A prediction is missing: no attempt yet, the verdict shows the puzzle that lacks it.
  const missing = isPrediction(c) ? missingPrediction(c, state.predictions) : null;
  if (missing !== null)
    return { ...state, test: missing.test, run: null, phase: "done", verdict: { ok: false, ...missing } };
  const pre = programVerdict(c, state.program);
  if (pre !== null)
    return {
      ...state,
      attempts: state.attempts + 1,
      run: null,
      phase: "done",
      verdict: { ok: false, test: 0, why: pre },
    };
  // Every start begins with the first test case.
  return { ...begun({ ...state, verdict: null, test: 1, results: [] }, c), phase };
}

/** A change of the prediction of the shown test case; it takes back the last run, as a new program does. */
function predict(state: State, c: Challenge, name: string, value: Json | undefined): State {
  if (!isPrediction(c) || state.phase === "running") return state;
  const n = state.test;
  const now = state.predictions[n - 1] ?? null;
  const way = Array.isArray(now) ? now : [];
  let next: Prediction | undefined;
  if (name === "feld" && typeof value === "string") next = withField(c, n, way, value) ?? undefined;
  else if (name === "zurueck" && way.length > 0) next = way.slice(0, -1);
  else if (name === "leeren" && now !== null) next = null;
  else if (name === "bild") {
    const i = Number(value);
    if (Number.isInteger(i) && i >= 0 && i < picturesOf(c, n, state.seed).length && i !== now) next = i;
  }
  if (next === undefined) return state;
  const predictions = Array.from({ length: testCount(c) }, (_, i) => state.predictions[i] ?? null);
  predictions[n - 1] = next;
  return { ...state, predictions, run: null, phase: "edit", verdict: null, results: [] };
}

export function step(state: State, input: Input): State {
  if (input.kind !== "action") return state;
  const c = state.challenge;
  switch (input.name) {
    case "entwurf":
      // The authoring page: the draft as the author types it, checked at once.
      return state.draft === null || typeof input.value !== "string" || state.challenge !== null
        ? state
        : { ...state, draft: input.value, problems: draftProblems(input.value) };
    case "ausprobieren": {
      if (state.draft === null || state.challenge !== null) return state;
      const problems = draftProblems(state.draft);
      if (problems.length > 0) return { ...state, problems };
      return { ...fresh(state.seed, "route", JSON.parse(state.draft) as Challenge), draft: state.draft };
    }
    case "bearbeiten":
      return state.draft === null || state.challenge === null
        ? state
        : { ...fresh(state.seed, "route", null), draft: state.draft, problems: draftProblems(state.draft) };
    case "programm": {
      // A prediction keeps the program of the challenge.
      if (c === null || isPrediction(c) || programProblems(input.value).length > 0) return state;
      const program = input.value as unknown as Program;
      return {
        ...state,
        program,
        blocks: blocksOf(program).length,
        run: null,
        phase: "edit",
        verdict: null,
        results: [],
      };
    }
    case "testfall": {
      const n = Number(input.value);
      if (c === null || !Number.isInteger(n) || n < 1 || n > testCount(c) || state.phase === "running") return state;
      return { ...state, test: n, run: null, phase: "edit" };
    }
    case "tempo": {
      const t = Number(input.value);
      return Number.isInteger(t) && t >= 1 && t <= 5 && t !== state.tempo ? { ...state, tempo: t } : state;
    }
    case "hinweis":
      return c !== null && state.hints < c.hints.length ? { ...state, hints: state.hints + 1 } : state;
    default:
      break;
  }
  if (c === null) return state;
  switch (input.name) {
    case "feld":
    case "zurueck":
    case "leeren":
    case "bild":
      return predict(state, c, input.name, input.value);
    case "start":
      if (state.phase === "paused") return { ...state, phase: "running" };
      return state.phase === "running" ? state : launch(state, c, "running");
    case "schritt":
      if (state.phase === "paused") return stepRun(state, c);
      if (state.phase === "running") {
        const next = stepRun(state, c);
        return next.phase === "running" ? { ...next, phase: "paused" } : next;
      }
      {
        const launched = launch(state, c, "paused");
        return launched.phase === "paused" ? stepRun(launched, c) : launched;
      }
    case "stopp":
      return state.phase === "running" ? { ...state, phase: "paused" } : state;
    case "zuruecksetzen":
      return state.phase === "edit" && state.run === null
        ? state
        : { ...state, run: null, phase: "edit", verdict: null, results: [] };
    default:
      return state;
  }
}

export function tick(state: State): State {
  if (state.phase !== "running" || state.challenge === null) return state;
  const clock = state.clock + 1;
  if (clock < TEMPO_TICKS[state.tempo as 1]) return { ...state, clock };
  return { ...stepRun(state, state.challenge), clock: 0 };
}
