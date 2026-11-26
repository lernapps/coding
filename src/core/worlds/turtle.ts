// World "turtle", version 1: Kiko draws on a sheet of 200 × 200 units. It goes a number of steps and turns by degrees,
// with the pen down or up and in one of four colours. The picture to draw is a small program of this world (`ziel`);
// the check "bild-gleich" compares the lines drawn with the lines of that program (colours aside): every point of one
// must lie within 2 units of the other. The origin is at the top left; x goes right, y goes down.
import { runToEnd } from "../interpreter.ts";
import { programProblems, type Program, type Stmt } from "../ir.ts";
import { isInt, isObject, type Json, type Problem } from "../json.ts";
import type { Failure, Verdict, World } from "./types.ts";

export const SIZE = 200;
export const COLOURS = 4;
const TOLERANCE = 2;
const MAX_LINES = 2000;

export interface TurtleConfig {
  /** The picture to draw, as a program of this world. */
  ziel: Program;
  /** Where Kiko starts; else in the middle, looking up. Angle in degrees, 0 is up, clockwise. */
  start?: { x: number; y: number; winkel: number };
}
/** A line: from (x1, y1) to (x2, y2) in colour c (1 to 4). */
export type Line = [number, number, number, number, number];
export interface TurtleState {
  x: number;
  y: number;
  winkel: number;
  pen: boolean;
  colour: number;
  lines: Line[];
}

const round = (v: number): number => Math.round(v * 100) / 100;

function startOf(c: TurtleConfig): TurtleState {
  const s = c.start ?? { x: SIZE / 2, y: SIZE / 2, winkel: 0 };
  return { x: s.x, y: s.y, winkel: s.winkel, pen: true, colour: 1, lines: [] };
}

/** Points along the lines, every unit (for the comparison of pictures). */
function samples(lines: readonly Line[]): [number, number][] {
  const out: [number, number][] = [];
  for (const [x1, y1, x2, y2] of lines) {
    const n = Math.max(1, Math.ceil(Math.hypot(x2 - x1, y2 - y1)));
    for (let i = 0; i <= n; i++) out.push([x1 + ((x2 - x1) * i) / n, y1 + ((y2 - y1) * i) / n]);
  }
  return out;
}

function distanceToLines(p: [number, number], lines: readonly Line[]): number {
  let best = Infinity;
  for (const [x1, y1, x2, y2] of lines) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = dx * dx + dy * dy;
    const t = len === 0 ? 0 : Math.max(0, Math.min(1, ((p[0] - x1) * dx + (p[1] - y1) * dy) / len));
    best = Math.min(best, Math.hypot(p[0] - (x1 + t * dx), p[1] - (y1 + t * dy)));
  }
  return best;
}

/** The lines of the target picture. */
export function targetLines(c: TurtleConfig): Line[] {
  const run = runToEnd(c.ziel, turtle as unknown as World, c as unknown as Json, 10_000);
  return (run.world as unknown as TurtleState).lines;
}

const COMMANDS: Record<string, number> = {
  gehe: 1,
  "drehe-links-um": 1,
  "drehe-rechts-um": 1,
  "stift-hoch": 0,
  "stift-runter": 0,
  farbe: 1,
};

function commandsOf(stmts: readonly Stmt[]): string[] {
  return stmts.flatMap((s) => {
    if (s.s === "cmd") return [s.name];
    if (s.s === "repeat" || s.s === "while") return commandsOf(s.body);
    if (s.s === "if") return [...commandsOf(s.then), ...commandsOf(s.else ?? [])];
    return [];
  });
}

export const turtle: World<TurtleConfig, TurtleState> = {
  id: "turtle",
  version: 1,
  configProblems(config: unknown, path: string): Problem[] {
    if (!isObject(config)) return [{ path, key: "problem-config" }];
    const problems: Problem[] = [];
    for (const key of Object.keys(config))
      if (key !== "ziel" && key !== "start") problems.push({ path: `${path}.${key}`, key: "problem-unknown-field" });
    const ziel = config["ziel"];
    const zielProblems = programProblems(ziel, `${path}.ziel`);
    if (zielProblems.length > 0) problems.push(...zielProblems);
    else if (commandsOf((ziel as Program).main).some((n) => !(n in COMMANDS)))
      problems.push({ path: `${path}.ziel`, key: "problem-program" });
    const start = config["start"];
    if (
      start !== undefined &&
      !(isObject(start) && isInt(start["x"], 0, SIZE) && isInt(start["y"], 0, SIZE) && isInt(start["winkel"], 0, 359))
    )
      problems.push({ path: `${path}.start`, key: "problem-turtle-start", params: { size: SIZE } });
    return problems;
  },
  commands: COMMANDS,
  sensors: {},
  checks: {
    "bild-gleich": (s, c): Verdict => {
      const target = targetLines(c).filter((l) => l[0] !== l[2] || l[1] !== l[3]);
      const drawn = s.lines.filter((l) => l[0] !== l[2] || l[1] !== l[3]);
      for (const p of samples(target))
        if (distanceToLines(p, drawn) > TOLERANCE)
          return {
            ok: false,
            why: { key: "fail-picture-missing", params: { x: Math.round(p[0]), y: Math.round(p[1]) } },
          };
      for (const p of samples(drawn))
        if (distanceToLines(p, target) > TOLERANCE)
          return {
            ok: false,
            why: { key: "fail-picture-extra", params: { x: Math.round(p[0]), y: Math.round(p[1]) } },
          };
      return { ok: true };
    },
  },
  start: startOf,
  command(s, _c, name, args): TurtleState | Failure {
    const a = args[0] ?? 0;
    switch (name) {
      case "gehe": {
        const rad = (s.winkel * Math.PI) / 180;
        const x = round(s.x + a * Math.sin(rad));
        const y = round(s.y - a * Math.cos(rad));
        if (s.pen && s.lines.length >= MAX_LINES)
          return { fail: { key: "fail-too-many-lines", params: { max: MAX_LINES } } };
        const lines: Line[] = s.pen ? [...s.lines, [s.x, s.y, x, y, s.colour]] : s.lines;
        return { ...s, x, y, lines };
      }
      case "drehe-links-um":
        return { ...s, winkel: (((s.winkel - a) % 360) + 360) % 360 };
      case "drehe-rechts-um":
        return { ...s, winkel: (((s.winkel + a) % 360) + 360) % 360 };
      case "stift-hoch":
        return { ...s, pen: false };
      case "stift-runter":
        return { ...s, pen: true };
      case "farbe":
        return { ...s, colour: Math.min(COLOURS, Math.max(1, Math.round(a))) };
      default:
        return s;
    }
  },
  sense: () => false,
  describe: (s) => ({
    key: "describe-turtle",
    params: { x: Math.round(s.x), y: Math.round(s.y), winkel: Math.round(s.winkel), lines: s.lines.length },
  }),
};
