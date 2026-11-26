// World "labyrinth", version 1: a robot on a grid of walls (#), ways (.), the start (S) and the goal (Z). It moves
// forward and turns; it senses walls around it and whether it stands on the goal. Fields are named by column and row,
// counted from 1 at the top left.
import { isObject, type Problem } from "../json.ts";
import type { Failure, Verdict, World } from "./types.ts";

export type Facing = "north" | "east" | "south" | "west";
export interface LabyrinthConfig {
  map: string[];
  facing: Facing;
}
export interface LabyrinthState {
  x: number;
  y: number;
  facing: Facing;
  /** Fields the robot visited, as "x,y" (for the trail in the view). */
  trail: string[];
}

export const FACINGS: readonly Facing[] = ["north", "east", "south", "west"];
const DELTA: Record<Facing, readonly [number, number]> = { north: [0, -1], east: [1, 0], south: [0, 1], west: [-1, 0] };
export const MAX_SIZE = 12;

const at = (c: LabyrinthConfig, x: number, y: number): string => c.map[y]?.[x] ?? "#";
const turn = (f: Facing, by: number): Facing => FACINGS[(FACINGS.indexOf(f) + by + 4) % 4] ?? f;
const wall = (s: LabyrinthState, c: LabyrinthConfig, by: number): boolean => {
  const [dx, dy] = DELTA[turn(s.facing, by)];
  return at(c, s.x + dx, s.y + dy) === "#";
};
const field = (s: { x: number; y: number }): { x: number; y: number } => ({ x: s.x + 1, y: s.y + 1 });

function find(c: LabyrinthConfig, ch: string): { x: number; y: number } {
  for (let y = 0; y < c.map.length; y++) {
    const x = c.map[y]?.indexOf(ch) ?? -1;
    if (x >= 0) return { x, y };
  }
  return { x: 0, y: 0 };
}

export const labyrinth: World<LabyrinthConfig, LabyrinthState> = {
  id: "labyrinth",
  version: 1,
  configProblems(config: unknown, path: string): Problem[] {
    if (!isObject(config)) return [{ path, key: "problem-config" }];
    const map = config["map"];
    const problems: Problem[] = [];
    for (const key of Object.keys(config))
      if (key !== "map" && key !== "facing") problems.push({ path: `${path}.${key}`, key: "problem-unknown-field" });
    if (!FACINGS.includes(config["facing"] as Facing)) problems.push({ path: `${path}.facing`, key: "problem-facing" });
    if (!Array.isArray(map) || map.length < 1 || map.length > MAX_SIZE || !map.every((r) => typeof r === "string"))
      return [...problems, { path: `${path}.map`, key: "problem-map-size", params: { max: MAX_SIZE } }];
    const rows = map as string[];
    const width = rows[0]?.length ?? 0;
    if (width < 1 || width > MAX_SIZE || rows.some((r) => r.length !== width))
      problems.push({ path: `${path}.map`, key: "problem-map-size", params: { max: MAX_SIZE } });
    if (rows.some((r) => /[^#.SZ]/.test(r))) problems.push({ path: `${path}.map`, key: "problem-map-chars" });
    const count = (ch: string): number => rows.join("").split(ch).length - 1;
    if (count("S") !== 1) problems.push({ path: `${path}.map`, key: "problem-map-start" });
    if (count("Z") < 1) problems.push({ path: `${path}.map`, key: "problem-map-goal" });
    return problems;
  },
  commands: { vorwaerts: 0, links: 0, rechts: 0 },
  /** "weg-frei" is "wand-voraus" turned round, for beginners: no "nicht" needed. */
  sensors: { "wand-voraus": 0, "wand-links": 0, "wand-rechts": 0, "am-ziel": 0, "weg-frei": 0 },
  checks: {
    "ziel-erreicht": (s, c): Verdict =>
      at(c, s.x, s.y) === "Z" ? { ok: true } : { ok: false, why: { key: "fail-not-at-goal", params: field(s) } },
  },
  start(c) {
    const s = find(c, "S");
    return { ...s, facing: c.facing, trail: [`${s.x},${s.y}`] };
  },
  command(s, c, name): LabyrinthState | Failure {
    if (name === "links") return { ...s, facing: turn(s.facing, -1) };
    if (name === "rechts") return { ...s, facing: turn(s.facing, 1) };
    if (wall(s, c, 0)) return { fail: { key: "fail-wall", params: field(s) } };
    const [dx, dy] = DELTA[s.facing];
    const x = s.x + dx;
    const y = s.y + dy;
    return { x, y, facing: s.facing, trail: [...s.trail, `${x},${y}`] };
  },
  sense(s, c, name) {
    if (name === "am-ziel") return at(c, s.x, s.y) === "Z";
    if (name === "weg-frei") return !wall(s, c, 0);
    return wall(s, c, name === "wand-links" ? -1 : name === "wand-rechts" ? 1 : 0);
  },
  describe: (s, c) => ({
    key: "describe-labyrinth",
    params: { ...field(s), facing: s.facing, goal: at(c, s.x, s.y) === "Z" ? "yes" : "no" },
  }),
};
