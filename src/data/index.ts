// The built-in collection (way B): one challenge per route of src/app.yaml, in its order, and the model solutions
// and model predictions (only for the playthroughs and tests, never sent to a learner).
import type { Challenge } from "../core/challenge.ts";
import type { Program } from "../core/ir.ts";
import type { Prediction } from "../core/prediction.ts";
import l1 from "./challenges/labyrinth-1.json" with { type: "json" };
import l2 from "./challenges/labyrinth-2.json" with { type: "json" };
import l3 from "./challenges/labyrinth-3.json" with { type: "json" };
import l4 from "./challenges/labyrinth-4.json" with { type: "json" };
import l5 from "./challenges/labyrinth-5.json" with { type: "json" };
import t1 from "./challenges/turtle-1.json" with { type: "json" };
import t2 from "./challenges/turtle-2.json" with { type: "json" };
import t3 from "./challenges/turtle-3.json" with { type: "json" };
import h1 from "./challenges/html-1.json" with { type: "json" };
import v1 from "./challenges/vorhersage-1.json" with { type: "json" };
import v2 from "./challenges/vorhersage-2.json" with { type: "json" };
import v3 from "./challenges/vorhersage-3.json" with { type: "json" };
import s1 from "./solutions/labyrinth-1.json" with { type: "json" };
import s2 from "./solutions/labyrinth-2.json" with { type: "json" };
import s3 from "./solutions/labyrinth-3.json" with { type: "json" };
import s4 from "./solutions/labyrinth-4.json" with { type: "json" };
import s5 from "./solutions/labyrinth-5.json" with { type: "json" };
import u1 from "./solutions/turtle-1.json" with { type: "json" };
import u2 from "./solutions/turtle-2.json" with { type: "json" };
import u3 from "./solutions/turtle-3.json" with { type: "json" };
import p1 from "./solutions/vorhersage-1.json" with { type: "json" };
import p2 from "./solutions/vorhersage-2.json" with { type: "json" };
import p3 from "./solutions/vorhersage-3.json" with { type: "json" };

/** In the order of the routes: sequence, count loop, conditional loop, selection, both, then predictions. */
const list = [l1, t1, l2, t2, t3, l3, l4, l5, v1, v2, v3, h1] as unknown as Challenge[];

export const ROUTES: readonly string[] = list.map((c) => c.id);
export const BUILT_IN: Readonly<Record<string, Challenge>> = Object.fromEntries(list.map((c) => [c.id, c]));
export const SOLUTIONS: Readonly<Record<string, Program>> = {
  "labyrinth-1": s1 as Program,
  "labyrinth-2": s2 as Program,
  "labyrinth-3": s3 as Program,
  "labyrinth-4": s4 as Program,
  "labyrinth-5": s5 as Program,
  "turtle-1": u1 as Program,
  "turtle-2": u2 as Program,
  "turtle-3": u3 as Program,
};
/** The model prediction per test case of each prediction challenge (its program is given; a solution is a prediction). */
export const PREDICTIONS: Readonly<Record<string, Prediction[]>> = {
  "vorhersage-1": p1,
  "vorhersage-2": p2,
  "vorhersage-3": p3,
};
