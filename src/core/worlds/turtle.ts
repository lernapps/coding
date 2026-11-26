// World "turtle", version 1: Kiko draws on a sheet of 200 × 200 units. It goes a number of steps and turns by degrees,
// with the pen down or up and in one of four colours. The picture to draw is a small program of this world (`ziel`);
// the check "bild-gleich" compares the lines drawn with the lines of that program (colours aside): every point of one
// must lie within 2 units of the other. The origin is at the top left; x goes right, y goes down.
import { runToEnd } from "../interpreter.ts";
import { fitProblems } from "../fits.ts";
import { programProblems, type Program } from "../ir.ts";
import { isInt, isObject, type Json, type Problem } from "../json.ts";
import type { Failure, Verdict, World } from "./types.ts";

export const SIZE = 200;
export const COLOURS = 4;
const TOLERANCE = 2;
const MAX_LINES = 1000;
/** The most lines of a target picture. */
export const MAX_TARGET_LINES = 200;
/** The grid of the comparison: one cell per unit, a margin of 50 around the sheet. */
const MARGIN = 50;
const GRID = SIZE + 2 * MARGIN;

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

/** The cells a picture covers: every line sampled twice per unit (at most 2000 samples a line), off the grid clamped. */
function cover(lines: readonly Line[]): Uint8Array {
  const grid = new Uint8Array(GRID * GRID);
  const cell = (v: number): number => Math.min(GRID - 1, Math.max(0, Math.floor(v + MARGIN)));
  for (const [x1, y1, x2, y2] of lines) {
    const n = Math.min(2000, Math.max(1, Math.ceil(Math.hypot(x2 - x1, y2 - y1) * 2)));
    for (let i = 0; i <= n; i++) grid[cell(y1 + ((y2 - y1) * i) / n) * GRID + cell(x1 + ((x2 - x1) * i) / n)] = 1;
  }
  return grid;
}

/** The cells within TOLERANCE of a covered cell. */
function widen(grid: Uint8Array): Uint8Array {
  const out = new Uint8Array(grid.length);
  for (let y = 0; y < GRID; y++)
    for (let x = 0; x < GRID; x++) {
      if (grid[y * GRID + x] !== 1) continue;
      for (let dy = -TOLERANCE; dy <= TOLERANCE; dy++)
        for (let dx = -TOLERANCE; dx <= TOLERANCE; dx++) {
          const yy = y + dy;
          const xx = x + dx;
          if (yy >= 0 && yy < GRID && xx >= 0 && xx < GRID) out[yy * GRID + xx] = 1;
        }
    }
  return out;
}

/** The first cell of `a` that `near` does not cover, as a point of the sheet; null when there is none. */
function firstOutside(a: Uint8Array, near: Uint8Array): { x: number; y: number } | null {
  for (let i = 0; i < a.length; i++)
    if (a[i] === 1 && near[i] !== 1) return { x: (i % GRID) - MARGIN, y: Math.floor(i / GRID) - MARGIN };
  return null;
}

/** The lines of the target picture. */
export function targetLines(c: TurtleConfig): Line[] {
  const run = runToEnd(c.ziel, turtle as unknown as World, c as unknown as Json, 10_000);
  return (run.world as unknown as TurtleState).lines;
}

const RANGES: Record<string, readonly (readonly [number, number])[]> = {
  gehe: [[1, SIZE]],
  "drehe-links-um": [[1, 360]],
  "drehe-rechts-um": [[1, 360]],
  farbe: [[1, COLOURS]],
};

const COMMANDS: Record<string, number> = {
  gehe: 1,
  "drehe-links-um": 1,
  "drehe-rechts-um": 1,
  "stift-hoch": 0,
  "stift-runter": 0,
  farbe: 1,
};

export const turtle: World<TurtleConfig, TurtleState> = {
  id: "turtle",
  version: 1,
  configProblems(config: unknown, path: string): Problem[] {
    if (!isObject(config)) return [{ path, key: "problem-config" }];
    const problems: Problem[] = [];
    for (const key of Object.keys(config))
      if (key !== "ziel" && key !== "start") problems.push({ path: `${path}.${key}`, key: "problem-unknown-field" });
    const ziel = config["ziel"];
    const syntax = programProblems(ziel, `${path}.ziel`);
    const fit = syntax.length > 0 ? syntax : fitProblems(ziel as Program, turtle as unknown as World, `${path}.ziel`);
    problems.push(...fit);
    const start = config["start"];
    if (
      start !== undefined &&
      !(isObject(start) && isInt(start["x"], 0, SIZE) && isInt(start["y"], 0, SIZE) && isInt(start["winkel"], 0, 359))
    )
      problems.push({ path: `${path}.start`, key: "problem-turtle-start", params: { size: SIZE } });
    if (fit.length === 0 && problems.length === 0) {
      const run = runToEnd(ziel as Program, turtle as unknown as World, config as unknown as Json, 10_000);
      const lines = (run.world as unknown as TurtleState).lines.length;
      if (run.status !== "done" || lines > MAX_TARGET_LINES)
        problems.push({ path: `${path}.ziel`, key: "problem-target-lines", params: { max: MAX_TARGET_LINES } });
    }
    return problems;
  },
  commands: COMMANDS,
  ranges: RANGES,
  sensors: {},
  checks: {
    "bild-gleich": (s, c): Verdict => {
      const target = cover(targetLines(c).filter((l) => l[0] !== l[2] || l[1] !== l[3]));
      const drawn = cover(s.lines.filter((l) => l[0] !== l[2] || l[1] !== l[3]));
      const missing = firstOutside(target, widen(drawn));
      if (missing !== null) return { ok: false, why: { key: "fail-picture-missing", params: missing } };
      const extra = firstOutside(drawn, widen(target));
      if (extra !== null) return { ok: false, why: { key: "fail-picture-extra", params: extra } };
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
