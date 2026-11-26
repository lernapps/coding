// The built-in collection (way B): one challenge per route of src/app.yaml, in its order, and the model solutions
// (only for the playthroughs and tests, never sent to a learner).
import type { Challenge } from "../core/challenge.ts";
import type { Program } from "../core/ir.ts";
import l1 from "./challenges/labyrinth-1.json" with { type: "json" };
import l2 from "./challenges/labyrinth-2.json" with { type: "json" };
import l3 from "./challenges/labyrinth-3.json" with { type: "json" };
import s1 from "./solutions/labyrinth-1.json" with { type: "json" };
import s2 from "./solutions/labyrinth-2.json" with { type: "json" };
import s3 from "./solutions/labyrinth-3.json" with { type: "json" };

const list = [l1, l2, l3] as unknown as Challenge[];

export const ROUTES: readonly string[] = list.map((c) => c.id);
export const BUILT_IN: Readonly<Record<string, Challenge>> = Object.fromEntries(list.map((c) => [c.id, c]));
export const SOLUTIONS: Readonly<Record<string, Program>> = {
  "labyrinth-1": s1 as Program,
  "labyrinth-2": s2 as Program,
  "labyrinth-3": s3 as Program,
};
