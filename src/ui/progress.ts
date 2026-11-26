// What the workshop remembers on the device (createStorage, prefix lernapps:coding:): the tasks a learner solved and
// the last program of each task, at most MAX_PROGRAMS (the oldest goes first). A task is named by where it came from
// and its id ("route:labyrinth-1", "address:schleife-gang").
import { createStorage, type DeviceStorage } from "@lernapps/tooling/storage";
import { programProblems, type Program } from "../core/ir.ts";

export const MAX_PROGRAMS = 50;

interface Saved {
  solved: string[];
  /** Task key → program, the most recent last. */
  programs: [string, Program][];
}

const isSaved = (value: unknown): value is Saved =>
  typeof value === "object" &&
  value !== null &&
  Array.isArray((value as Saved).solved) &&
  (value as Saved).solved.every((s) => typeof s === "string") &&
  Array.isArray((value as Saved).programs) &&
  (value as Saved).programs.every(
    (p) => Array.isArray(p) && typeof p[0] === "string" && programProblems(p[1]).length === 0,
  );

/** The IR without the ids of the blocks (they change with every load of the editor). */
function plain(program: Program): Program {
  return JSON.parse(JSON.stringify(program, (key, value: unknown) => (key === "id" ? undefined : value))) as Program;
}

export interface Progress {
  solved(key: string): boolean;
  program(key: string): Program | undefined;
  markSolved(key: string): void;
  keep(key: string, program: Program): void;
}

/** The progress on this device; works (and remembers nothing) when storage is blocked. */
export function progress(storage: DeviceStorage = createStorage("coding")): Progress {
  const saved: Saved = storage.load("progress", isSaved) ?? { solved: [], programs: [] };
  const write = (): void => {
    storage.save("progress", saved);
  };
  return {
    solved: (key) => saved.solved.includes(key),
    program: (key) => saved.programs.find(([k]) => k === key)?.[1],
    markSolved(key) {
      if (saved.solved.includes(key)) return;
      saved.solved.push(key);
      write();
    },
    keep(key, program) {
      saved.programs = saved.programs.filter(([k]) => k !== key);
      if (program.main.length > 0) saved.programs.push([key, plain(program)]);
      saved.programs = saved.programs.slice(-MAX_PROGRAMS);
      write();
    },
  };
}
