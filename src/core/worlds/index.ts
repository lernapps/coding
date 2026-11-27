// The worlds of the workshop by type and version. A challenge names both; a version not here is not run.
import type { Json } from "../json.ts";
import { html } from "./html.ts";
import { labyrinth } from "./labyrinth.ts";
import { turtle } from "./turtle.ts";
import type { World } from "./types.ts";

const as = <C, S>(world: World<C, S>): World => world as unknown as World<Json, Json>;

export const WORLDS: Readonly<Record<string, Readonly<Record<number, World>>>> = {
  labyrinth: { 1: as(labyrinth) },
  turtle: { 1: as(turtle) },
  html: { 1: as(html) },
};

export function worldOf(type: string, version: number): World | undefined {
  return WORLDS[type]?.[version];
}

export const newestVersion = (type: string): number => Math.max(0, ...Object.keys(WORLDS[type] ?? {}).map(Number));
