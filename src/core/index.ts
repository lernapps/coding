// The core of the workshop (contract of @lernapps/app-templates/interactive): the challenge, the learner's program as
// IR, and the run of it on the test case shown. Pure TypeScript, the state plain JSON. Blockly is only the input: the
// UI sends the program as the action "programm".
import type { Input } from "@lernapps/app-templates/interactive";
import {
  challengeProblems,
  configAt,
  MAX_LINK,
  firstFailure,
  judgeRun,
  programVerdict,
  testCount,
  type Challenge,
} from "./challenge.ts";
import { advance, begin, type Run } from "./interpreter.ts";
import { blocksOf, EMPTY, programProblems, type Program } from "./ir.ts";
import { isObject, type Msg, type Problem } from "./json.ts";
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
  /** Why the challenge from the address cannot run. */
  problems: Problem[];
  program: Program;
  blocks: number;
  /** The test case shown, from 1. */
  test: number;
  run: Run | null;
  phase: Phase;
  verdict: Verdict | null;
  attempts: number;
  solved: boolean;
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
    program,
    blocks: blocksOf(program).length,
    test: 1,
    run: null,
    phase: "edit",
    verdict: null,
    attempts: 0,
    solved: false,
    hints: 0,
    tempo: DEFAULT_TEMPO,
    clock: 0,
  };
}

export function start(seed: number, route: string): State {
  return fresh(seed, "route", BUILT_IN[route] ?? BUILT_IN[ROUTES[0] ?? ""] ?? null);
}

const worldFor = (c: Challenge) => worldOf(c.world.type, c.world.version);

/** The run of the shown test case, begun. */
function begun(state: State, c: Challenge): State {
  const world = worldFor(c);
  if (world === undefined) return state;
  return { ...state, run: begin(state.program, world, configAt(c, state.test)), clock: 0 };
}

/** After a step of the run: the verdict once it ended. */
function settle(state: State, c: Challenge): State {
  const run = state.run;
  const world = worldFor(c);
  if (run === null || world === undefined || run.status === "running") return state;
  const shown = judgeRun(c, world, state.test, run);
  if (!shown.ok)
    return {
      ...state,
      phase: "done",
      verdict: { ok: false, test: state.test, ...(shown.why ? { why: shown.why } : {}) },
    };
  const failure = firstFailure(c, state.program);
  if (failure !== null)
    return { ...state, phase: "done", verdict: { ok: false, test: failure.test, why: failure.why } };
  return { ...state, phase: "done", verdict: { ok: true, test: state.test }, solved: true };
}

function stepRun(state: State, c: Challenge): State {
  const world = worldFor(c);
  if (state.run === null || world === undefined) return state;
  const run = advance(state.run, state.program, world, configAt(c, state.test), c.limits.steps ?? 1000);
  return settle({ ...state, run }, c);
}

/** Starts a run: the program's own checks first (block limit), then the shown test case. */
function launch(state: State, c: Challenge, phase: Phase): State {
  const attempts = state.attempts + 1;
  const pre = programVerdict(c, state.program);
  if (pre !== null) return { ...state, attempts, run: null, phase: "done", verdict: { ok: false, test: 0, why: pre } };
  return { ...begun({ ...state, attempts, verdict: null }, c), phase };
}

export function step(state: State, input: Input): State {
  if (input.kind !== "action") return state;
  const c = state.challenge;
  switch (input.name) {
    case "challenge": {
      // TODO(lernapps/app-templates#201): the challenge of the address (?c=) comes as an action of the root component
      // until the runtime gives the address's parameters to start(seed, route, params).
      if (isObject(input.value) && input.value["error"] === "too-long")
        return fresh(state.seed, "address", null, [{ path: "", key: "problem-too-long", params: { max: MAX_LINK } }]);
      if (input.value === null || input.value === undefined)
        return fresh(state.seed, "address", null, [{ path: "", key: "problem-unreadable" }]);
      const problems = challengeProblems(input.value);
      return problems.length > 0
        ? fresh(state.seed, "address", null, problems)
        : fresh(state.seed, "address", input.value as unknown as Challenge);
    }
    case "route": {
      // TODO(lernapps/app-templates#201): leaving a challenge of the address for a route of the collection; the runtime
      // does not restart when the route of the address is the one it started with.
      const id = String(input.value);
      return state.source === "address" && BUILT_IN[id] !== undefined
        ? fresh(state.seed, "route", BUILT_IN[id])
        : state;
    }
    case "programm": {
      if (c === null || programProblems(input.value).length > 0) return state;
      const program = input.value as unknown as Program;
      return { ...state, program, blocks: blocksOf(program).length, run: null, phase: "edit", verdict: null };
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
        : { ...state, run: null, phase: "edit", verdict: null };
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
