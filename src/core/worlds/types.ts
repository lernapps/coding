// The interface of a world: a kind of task (labyrinth, turtle), pure and without DOM. Its view and its blocks are in
// src/ui/worlds/<id>/, apart from this, because the core has no DOM (decision in docs/arc42, chapter 9).
import type { Json, Msg, Problem } from "../json.ts";

/** A command the world refuses: why, for the learner. Ends the run. */
export interface Failure {
  fail: Msg;
}

/** The result of a check: passed, or why not. */
export type Verdict = { ok: true } | { ok: false; why: Msg };

export interface World<C = Json, S = Json> {
  /** "labyrinth", "turtle"; a challenge names it in `world.type`. */
  id: string;
  /** The version; a challenge names the version it needs. Older versions stay runnable as their own module. */
  version: number;
  /** Problems of a challenge's world config (after a test case's config is laid over it). */
  configProblems(config: unknown, path: string): Problem[];
  /** The commands and sensors with the number of their arguments; the toolbox ids of this world. */
  commands: Readonly<Record<string, number>>;
  sensors: Readonly<Record<string, number>>;
  /** The allowed range of each argument of a command ([min, max] per argument), for programs from outside. */
  ranges?: Readonly<Record<string, readonly (readonly [number, number])[]>>;
  /** The checks this world offers to challenges ("ziel-erreicht"). */
  checks: Readonly<Record<string, (state: S, config: C) => Verdict>>;
  start(config: C): S;
  command(state: S, config: C, name: string, args: number[]): S | Failure;
  sense(state: S, config: C, name: string, args: number[]): boolean | number;
  /** Whether the run is over on its own (the robot is at the goal); optional. */
  finished?(state: S, config: C): boolean;
  /** The state as text, for screen readers. */
  describe(state: S, config: C): Msg;
}

export const isFailure = (value: unknown): value is Failure =>
  typeof value === "object" && value !== null && "fail" in value;
