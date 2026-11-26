// Whether a program from outside (the start program of a challenge, the target picture of the turtle) fits a world:
// only its commands and sensors and the blocks of the workshop, numbers as literals in the ranges the editor offers.
// So the editor can show it, and it runs as it is shown.
import type { Expr, Program, Stmt } from "./ir.ts";
import type { Problem } from "./json.ts";
import type { World } from "./worlds/types.ts";

/** The range of the number in "wiederhole … mal". */
export const REPEAT_RANGE = [1, 99] as const;

export function fitProblems(program: Program, world: World, path: string): Problem[] {
  const problems: Problem[] = [];
  const bad = (at: string, name?: string): void => {
    problems.push(
      name === undefined ? { path: at, key: "problem-program" } : { path: at, key: "problem-block", params: { name } },
    );
  };
  const literal = (e: Expr, [min, max]: readonly [number, number], at: string): void => {
    if (e.e !== "num" || !Number.isFinite(e.value) || e.value < min || e.value > max)
      problems.push({ path: at, key: "problem-number", params: { min, max } });
  };
  const expr = (e: Expr, at: string): void => {
    if (e.e === "empty") return;
    if (e.e === "not") return expr(e.a, `${at}.a`);
    if (e.e === "sense" && e.name in world.sensors && e.args.length === 0) return;
    bad(at, e.e === "sense" ? e.name : undefined);
  };
  const block = (stmts: readonly Stmt[], at: string): void =>
    stmts.forEach((s, i) => {
      const here = `${at}[${i}]`;
      switch (s.s) {
        case "cmd": {
          if (!(s.name in world.commands) || s.args.length !== world.commands[s.name]) return bad(here, s.name);
          const ranges = world.ranges?.[s.name] ?? [];
          s.args.forEach((a, j) => literal(a, ranges[j] ?? [-1e6, 1e6], `${here}.args[${j}]`));
          return;
        }
        case "repeat":
          literal(s.times, REPEAT_RANGE, `${here}.times`);
          return block(s.body, `${here}.body`);
        case "while":
          expr(s.cond, `${here}.cond`);
          return block(s.body, `${here}.body`);
        case "if":
          expr(s.cond, `${here}.cond`);
          block(s.then, `${here}.then`);
          if (s.else !== undefined) block(s.else, `${here}.else`);
          return;
        default:
          return bad(here);
      }
    });
  block(program.main, `${path}.main`);
  if ((program.procs ?? []).length > 0) bad(`${path}.procs`);
  return problems.slice(0, 5);
}
