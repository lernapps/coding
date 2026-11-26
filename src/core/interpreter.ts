// The interpreter: runs a program of the IR step by step against a world. Its state is plain JSON, so the runtime can
// keep it and a playthrough can expect it. One call of `advance` runs control steps up to the next command of the
// world and that command. The limit of a challenge counts commands of the world (what the learner sees); a hard limit
// of all steps, control steps included, stops a loop that runs without any command.
import type { Expr, Program, Stmt } from "./ir.ts";
import type { Json, Msg } from "./json.ts";
import { isFailure, type World } from "./worlds/types.ts";

/** The most commands of any run. */
export const MAX_COMMANDS = 10_000;
/** The hard limit of all steps of a run, control steps included. */
export const MAX_STEPS = 50_000;

type Loop = { k: "repeat"; left: number } | { k: "while"; cond: Expr } | { k: "proc"; vars: Record<string, number> };
interface Frame {
  body: Stmt[];
  at: number;
  loop?: Loop;
}

export type RunStatus = "running" | "done" | "crashed" | "limit" | "error";
export interface Run {
  world: Json;
  frames: Frame[];
  vars: Record<string, number>;
  steps: number;
  /** World commands carried out. */
  commands: number;
  status: RunStatus;
  /** Why it crashed or failed (crashed, limit, error). */
  why?: Msg;
}

export function begin(program: Program, world: World, config: Json): Run {
  return {
    world: world.start(config),
    frames: [{ body: program.main, at: 0 }],
    vars: {},
    steps: 0,
    commands: 0,
    status: "running",
  };
}

class RunError extends Error {
  readonly why: Msg;
  constructor(why: Msg) {
    super(why.key);
    this.why = why;
  }
}

function evaluate(e: Expr, run: Run, world: World, config: Json): number | boolean {
  const num = (x: Expr): number => {
    const v = evaluate(x, run, world, config);
    return typeof v === "number" ? v : v ? 1 : 0;
  };
  const bool = (x: Expr): boolean => {
    const v = evaluate(x, run, world, config);
    return typeof v === "boolean" ? v : v !== 0;
  };
  switch (e.e) {
    case "num":
      return e.value;
    case "empty":
      throw new RunError({ key: "fail-empty-slot", params: { block: "?" } });
    case "var": {
      const v = lookup(run, e.name);
      if (v === undefined) throw new RunError({ key: "fail-unknown-variable", params: { name: e.name } });
      return v;
    }
    case "sense":
      if (!(e.name in world.sensors)) throw new RunError({ key: "fail-unknown-block", params: { name: e.name } });
      return world.sense(run.world, config, e.name, e.args.map(num));
    case "not":
      return !bool(e.a);
    case "and":
      return bool(e.a) && bool(e.b);
    case "or":
      return bool(e.a) || bool(e.b);
    case "cmp": {
      const a = num(e.a);
      const b = num(e.b);
      return { "<": a < b, "<=": a <= b, "=": a === b, "!=": a !== b, ">=": a >= b, ">": a > b }[e.op];
    }
    case "arith": {
      const a = num(e.a);
      const b = num(e.b);
      if ((e.op === "/" || e.op === "%") && b === 0) throw new RunError({ key: "fail-divide-by-zero" });
      return { "+": a + b, "-": a - b, "*": a * b, "/": a / b, "%": a % b }[e.op];
    }
  }
}

function lookup(run: Run, name: string): number | undefined {
  for (let i = run.frames.length - 1; i >= 0; i--) {
    const loop = run.frames[i]?.loop;
    if (loop?.k === "proc" && name in loop.vars) return loop.vars[name];
  }
  return run.vars[name];
}

const truthy = (v: number | boolean): boolean => (typeof v === "boolean" ? v : v !== 0);

/** Runs control steps up to and including the next world command; the run as it is then. */
export function advance(start: Run, program: Program, world: World, config: Json, limit: number): Run {
  if (start.status !== "running") return start;
  const run: Run = { ...start, frames: start.frames.map((f) => ({ ...f })), vars: { ...start.vars } };
  const max = Math.min(limit, MAX_COMMANDS);
  try {
    while (run.frames.length > 0) {
      if (run.commands >= max) return { ...run, status: "limit", why: { key: "fail-limit", params: { steps: max } } };
      if (run.steps >= MAX_STEPS) return { ...run, status: "limit", why: { key: "fail-endless" } };
      const top = run.frames[run.frames.length - 1];
      if (top === undefined) break;
      if (top.at >= top.body.length) {
        run.steps++;
        const loop = top.loop;
        if (loop?.k === "repeat" && loop.left > 1) {
          top.loop = { k: "repeat", left: loop.left - 1 };
          top.at = 0;
        } else if (loop?.k === "while" && truthy(evaluate(loop.cond, run, world, config))) {
          top.at = 0;
        } else run.frames.pop();
        continue;
      }
      const s = top.body[top.at++];
      if (s === undefined) continue;
      run.steps++;
      switch (s.s) {
        case "repeat": {
          const n = Number(evaluate(s.times, run, world, config));
          if (n >= 1 && s.body.length > 0)
            run.frames.push({ body: s.body, at: 0, loop: { k: "repeat", left: Math.floor(n) } });
          else if (n >= 1) run.steps += Math.min(Math.floor(n), MAX_STEPS);
          continue;
        }
        case "while":
          if (truthy(evaluate(s.cond, run, world, config)))
            run.frames.push({ body: s.body, at: 0, loop: { k: "while", cond: s.cond } });
          continue;
        case "if": {
          const branch = truthy(evaluate(s.cond, run, world, config)) ? s.then : (s.else ?? []);
          if (branch.length > 0) run.frames.push({ body: branch, at: 0 });
          continue;
        }
        case "set": {
          // A parameter or variable of the nearest procedure that has the name, else a variable of the program.
          const value = Number(evaluate(s.value, run, world, config));
          const frame = [...run.frames].reverse().find((f) => f.loop?.k === "proc" && s.name in f.loop.vars);
          if (frame?.loop?.k === "proc") frame.loop = { k: "proc", vars: { ...frame.loop.vars, [s.name]: value } };
          else run.vars[s.name] = value;
          continue;
        }
        case "call": {
          const proc = program.procs?.find((p) => p.name === s.name);
          if (proc === undefined) throw new RunError({ key: "fail-unknown-block", params: { name: s.name } });
          const vars: Record<string, number> = {};
          proc.params.forEach((p, i) => {
            const arg = s.args[i];
            vars[p] = arg === undefined ? 0 : Number(evaluate(arg, run, world, config));
          });
          run.frames.push({ body: proc.body, at: 0, loop: { k: "proc", vars } });
          continue;
        }
        case "cmd": {
          if (!(s.name in world.commands)) throw new RunError({ key: "fail-unknown-block", params: { name: s.name } });
          const args = s.args.map((a) => Number(evaluate(a, run, world, config)));
          const next = world.command(run.world, config, s.name, args);
          run.commands++;
          if (isFailure(next)) return { ...run, status: "crashed", why: next.fail };
          run.world = next;
          if (world.finished?.(next, config) === true) return { ...run, frames: [], status: "done" };
          return run;
        }
      }
    }
  } catch (error) {
    if (error instanceof RunError) return { ...run, status: "error", why: error.why };
    throw error;
  }
  return { ...run, status: "done" };
}

/** The id of the block of the statement that ran last (to highlight it in the editor). */
export function currentBlock(run: Run): string | null {
  for (let i = run.frames.length - 1; i >= 0; i--) {
    const f = run.frames[i];
    const s = f?.body[f.at - 1];
    if (s !== undefined) return s.id ?? null;
  }
  return null;
}

/** Runs a program to its end, without pictures (checks, the check script, playthroughs). */
export function runToEnd(program: Program, world: World, config: Json, limit: number): Run {
  let run = begin(program, world, config);
  while (run.status === "running") run = advance(run, program, world, config, limit);
  return run;
}
