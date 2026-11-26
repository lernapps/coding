// Spike: Programm-IR, schrittweiser Interpreter und eine kleine Welt Labyrinth. Reines TypeScript, JSON-Zustand.
import type { Input } from "@lernapps/app-templates/interactive";
import challenges from "../data/challenges.json" with { type: "json" };

export type Stmt =
  | { op: "cmd"; name: "vorwaerts" | "links" | "rechts" }
  | { op: "repeat"; n: number; body: Stmt[] }
  | { op: "while"; cond: "frei"; body: Stmt[] };

export interface Challenge {
  id: string;
  map: string[];
  facing: Dir;
  limit: number;
}
type Dir = "east" | "south" | "west" | "north";
const DIRS: Dir[] = ["east", "south", "west", "north"];
const DELTA: Record<Dir, [number, number]> = { east: [1, 0], south: [0, 1], west: [-1, 0], north: [0, -1] };

interface Frame {
  body: Stmt[];
  at: number;
  left: number | null;
  cond?: "frei";
}
export interface Robot {
  x: number;
  y: number;
  facing: Dir;
}
export interface State {
  seed: number;
  challenge: Challenge;
  program: Stmt[];
  robot: Robot;
  stack: Frame[];
  steps: number;
  clock: number;
  status: "edit" | "running" | "won" | "crashed" | "stopped" | "limit";
  error: string | null;
}

function find(map: string[], ch: string): { x: number; y: number } {
  for (let y = 0; y < map.length; y++) {
    const x = map[y]!.indexOf(ch);
    if (x >= 0) return { x, y };
  }
  return { x: 0, y: 0 };
}

function fresh(seed: number, challenge: Challenge, program: Stmt[]): State {
  return {
    seed,
    challenge,
    program,
    robot: { ...find(challenge.map, "S"), facing: challenge.facing },
    stack: [],
    steps: 0,
    clock: 0,
    status: "edit",
    error: null,
  };
}

export function start(seed: number, route: string): State {
  const all = challenges as Record<string, Challenge>;
  return fresh(seed, all[route] ?? all["gang"]!, []);
}

const wall = (s: State, r: Robot): boolean => {
  const [dx, dy] = DELTA[r.facing];
  return (s.challenge.map[r.y + dy]?.[r.x + dx] ?? "#") === "#";
};

function isChallenge(v: unknown): v is Challenge {
  if (typeof v !== "object" || v === null) return false;
  const c = v as Record<string, unknown>;
  return (
    typeof c["id"] === "string" &&
    Array.isArray(c["map"]) &&
    (c["map"] as unknown[]).every((r) => typeof r === "string") &&
    DIRS.includes(c["facing"] as Dir) &&
    typeof c["limit"] === "number"
  );
}

export function step(state: State, input: Input): State {
  if (input.kind !== "action") return state;
  switch (input.name) {
    case "challenge":
      return isChallenge(input.value)
        ? fresh(state.seed, input.value, state.program)
        : { ...state, error: "ungueltig" };
    case "programm":
      if (state.status === "running") return state;
      return { ...fresh(state.seed, state.challenge, input.value as unknown as Stmt[]) };
    case "start": {
      const s = fresh(state.seed, state.challenge, state.program);
      return { ...s, status: "running", stack: [{ body: s.program, at: 0, left: null }] };
    }
    case "schritt":
      return state.status === "running" ? advance(state) : state;
    case "stopp":
      return state.status === "running" ? { ...state, status: "stopped" } : state;
    default:
      return state;
  }
}

/** Tempo: ein Befehl alle TEMPO Ticks (10 × 20 ms). */
export const TEMPO = 10;

export function tick(state: State): State {
  if (state.status !== "running") return state;
  const clock = state.clock + 1;
  return clock >= TEMPO ? { ...advance(state), clock: 0 } : { ...state, clock };
}

/** Ein Befehl der Welt pro Schritt; Steuerblöcke werden dabei aufgelöst. */
function advance(state: State): State {
  const stack = state.stack.map((f) => ({ ...f }));
  let robot = state.robot;
  let guard = 0;
  while (stack.length > 0 && guard++ < 1000) {
    const top = stack[stack.length - 1]!;
    if (top.at >= top.body.length) {
      if (top.left !== null && top.left > 1) {
        top.left--;
        top.at = 0;
        continue;
      }
      if (top.cond === "frei" && !wall(state, robot)) {
        top.at = 0;
        continue;
      }
      stack.pop();
      continue;
    }
    const s = top.body[top.at++]!;
    if (s.op === "repeat") {
      if (s.n > 0) stack.push({ body: s.body, at: 0, left: s.n });
      continue;
    }
    if (s.op === "while") {
      if (!wall(state, robot)) stack.push({ body: s.body, at: 0, left: null, cond: "frei" });
      continue;
    }
    const steps = state.steps + 1;
    if (s.name === "vorwaerts") {
      if (wall(state, robot)) return { ...state, stack, robot, steps, status: "crashed" };
      const [dx, dy] = DELTA[robot.facing];
      robot = { ...robot, x: robot.x + dx, y: robot.y + dy };
    } else {
      const i = DIRS.indexOf(robot.facing) + (s.name === "rechts" ? 1 : 3);
      robot = { ...robot, facing: DIRS[i % 4]! };
    }
    const won = state.challenge.map[robot.y]![robot.x] === "Z";
    const status = won ? "won" : steps >= state.challenge.limit ? "limit" : "running";
    return { ...state, stack, robot, steps, status };
  }
  return { ...state, stack: [], robot, status: "stopped" };
}
