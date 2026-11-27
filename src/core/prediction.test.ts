// Predictions: the core takes a way or a picture, compares it with the run and names the first step where they part;
// the validator refuses a prediction challenge it cannot judge.
import { describe, expect, it } from "vite-plus/test";
import { BUILT_IN, PREDICTIONS } from "../data/index.ts";
import de from "../messages/de.json";
import en from "../messages/en.json";
import { challengeProblems, configAt, testCount, type Challenge } from "./challenge.ts";
import { start, step, type State } from "./index.ts";
import type { Program, Stmt } from "./ir.ts";
import type { Json } from "./json.ts";
import { isPrediction, judgePrediction, orderOf, picturesOf, runOf, withField, type Prediction } from "./prediction.ts";

const cmd = (name: string, ...args: number[]): Stmt => ({
  s: "cmd",
  name,
  args: args.map((value) => ({ e: "num", value })),
});
const repeat = (times: number, body: Stmt[]): Stmt => ({ s: "repeat", times: { e: "num", value: times }, body });

/** Kiko goes east two fields, turns right and goes down one: (2|2) → (3|2) → (4|2) → (4|3). */
const way: Challenge = {
  format: 1,
  id: "vorhersage-test",
  title: { de: "Test" },
  task: { de: "Sag voraus, wohin Kiko geht." },
  world: {
    type: "labyrinth",
    version: 1,
    config: { map: ["#####", "#S..#", "###.#", "###Z#", "#####"], facing: "east" },
  },
  toolbox: ["vorwaerts", "rechts", "wiederhole"],
  start: { main: [repeat(2, [cmd("vorwaerts")]), cmd("rechts"), cmd("vorwaerts")] },
  limits: {},
  tests: [],
  checks: ["vorhersage"],
  hints: [],
  view: "bloecke",
};
const square = (side: number, turn: string, times = 4): Program => ({
  main: [repeat(times, [cmd("gehe", side), cmd(turn, 90)])],
});
const picture: Challenge = {
  ...way,
  id: "vorhersage-bild",
  world: { type: "turtle", version: 1, config: { ziel: square(50, "drehe-rechts-um") } as unknown as Json },
  toolbox: ["gehe", "drehe-rechts-um", "drehe-links-um", "wiederhole"],
  start: square(50, "drehe-rechts-um"),
  vorhersage: { bilder: [square(50, "drehe-links-um"), square(50, "drehe-rechts-um", 3)] },
};

const act = (s: State, name: string, value?: string | number): State =>
  step(s, value === undefined ? { kind: "action", name } : { kind: "action", name, value });
const run = (s: State): State => {
  let now = act(s, "start");
  for (let i = 0; i < 10_000 && (now.phase === "running" || now.phase === "paused"); i++) now = act(now, "schritt");
  return now;
};
const withChallenge = (c: Challenge): State => ({
  ...start(1, "labyrinth-1"),
  challenge: c,
  program: c.start ?? { main: [] },
});
const setWay = (s: State, fields: string[]): State => fields.reduce((acc, f) => act(acc, "feld", f), s);

describe("prediction of a way", () => {
  it("accepts the challenge", () => expect(challengeProblems(way)).toEqual([]));

  it("passes the right way", () => {
    const done = run(setWay(withChallenge(way), ["2,1", "3,1", "3,2"]));
    expect(done.verdict).toEqual({ ok: true, test: 1 });
    expect(done.solved).toBe(true);
    expect(done.attempts).toBe(1);
  });

  it("names the step Kiko goes on after a way that is too short", () => {
    const done = run(setWay(withChallenge(way), ["2,1"]));
    expect(done.verdict?.why).toEqual({ key: "fail-predict-more", params: { ok: 1, step: 2, x: 4, y: 2 } });
  });

  it("takes back the last field and refuses a wall", () => {
    const s = setWay(withChallenge(way), ["2,1", "3,1", "4,1"]);
    expect(s.predictions[0]).toEqual(["2,1", "3,1"]);
    expect(act(s, "zurueck").predictions[0]).toEqual(["2,1"]);
    expect(act(s, "leeren").predictions[0]).toBeNull();
  });

  it("names the step where the way parts", () => {
    const fork: Challenge = {
      ...way,
      world: { ...way.world, config: { map: ["#####", "#S..#", "#.#.#", "#.#Z#", "#####"], facing: "east" } },
    };
    const done = run(setWay(withChallenge(fork), ["2,1", "3,1", "3,2", "3,3"]));
    expect(done.verdict?.why).toEqual({ key: "fail-predict-less", params: { ok: 3, x: 4, y: 3, px: 4, py: 4 } });
    const wrong = run(setWay(withChallenge(fork), ["1,2"]));
    expect(wrong.verdict?.why).toEqual({
      key: "fail-predict-step-first",
      params: { ok: 0, step: 1, x: 3, y: 2, px: 2, py: 3 },
    });
  });

  it("stops Kiko at the first step that parts from the prediction", () => {
    const fork: Challenge = {
      ...way,
      world: { ...way.world, config: { map: ["#####", "#S..#", "#.#.#", "#.#Z#", "#####"], facing: "east" } },
    };
    const done = run(setWay(withChallenge(fork), ["2,1", "3,1", "4,1"].slice(0, 1).concat(["1,1"])));
    expect(done.predictions[0]).toEqual(["2,1", "1,1"]);
    expect(done.verdict?.why?.key).toBe("fail-predict-step");
    // Kiko went to (3,1), not on to the end of the way.
    expect(done.run?.world).toMatchObject({ x: 3, y: 1 });
    expect(done.attempts).toBe(1);
  });

  it("refuses a field that is not next to the last one, a wall, or outside", () => {
    const s = withChallenge(way);
    expect(act(s, "feld", "3,1")).toBe(s);
    expect(act(s, "feld", "1,0")).toBe(s);
    expect(act(s, "feld", "9,9")).toBe(s);
    expect(act(s, "feld", "x")).toBe(s);
  });

  it("asks for a prediction before the run, without counting an attempt", () => {
    const done = act(withChallenge(way), "start");
    expect(done.verdict).toEqual({ ok: false, test: 1, why: { key: "fail-predict-no-way" } });
    expect(done.attempts).toBe(0);
  });

  it("keeps the program", () => {
    const s = withChallenge(way);
    expect(step(s, { kind: "action", name: "programm", value: { main: [] } })).toBe(s);
  });
});

describe("prediction of a picture", () => {
  it("accepts the challenge", () => expect(challengeProblems(picture)).toEqual([]));

  it("shows the pictures in an order from the seed", () => {
    expect(orderOf(3, 1, 1).sort((a, b) => a - b)).toEqual([0, 1, 2]);
    expect(picturesOf(picture, 1, 1)).toHaveLength(3);
    expect(picturesOf(picture, 1, 1)).toEqual(picturesOf(picture, 1, 1));
  });

  it("passes the right picture and names the first line of a wrong one", () => {
    const s = withChallenge(picture);
    const pictures = picturesOf(picture, 1, s.seed);
    const right = runOf(picture, 1);
    const lines = (right!.world as { lines: number[][] }).lines;
    const index = pictures.findIndex((p) => JSON.stringify(p) === JSON.stringify(lines));
    expect(run(act(s, "bild", index)).verdict?.ok).toBe(true);
    const fewer = pictures.findIndex((p) => p.length === 3);
    expect(run(act(s, "bild", fewer)).verdict?.why).toEqual({
      key: "fail-predict-line-more",
      params: { ok: 3, line: 4, x1: 150, y1: 100, x2: 100, y2: 100 },
    });
    const left = pictures.findIndex((p, i) => i !== index && p.length === 4);
    expect(run(act(s, "bild", left)).verdict?.why).toEqual({
      key: "fail-predict-line",
      params: { ok: 1, line: 2, x1: 100, y1: 50, x2: 150, y2: 50, px: 50, py: 50 },
    });
  });

  it("refuses a picture that is not there", () => {
    const s = withChallenge(picture);
    expect(act(s, "bild", 3)).toBe(s);
  });
});

describe("validator of predictions", () => {
  it("refuses a prediction without a start program", () =>
    expect(challengeProblems({ ...way, start: null })).toContainEqual({ path: "start", key: "problem-predict-start" }));
  it("refuses a second check", () =>
    expect(challengeProblems({ ...way, checks: ["vorhersage", "ziel-erreicht"] })).toContainEqual({
      path: "checks",
      key: "problem-predict-checks",
    }));
  it("refuses a run that bumps into a wall", () =>
    expect(
      challengeProblems({ ...way, start: { main: [cmd("vorwaerts"), cmd("vorwaerts"), cmd("vorwaerts")] } }),
    ).toContainEqual({
      path: "start",
      key: "problem-predict-run",
      params: { n: 1 },
    }));
  it("refuses pictures in the labyrinth and a field without the check", () => {
    expect(challengeProblems({ ...way, vorhersage: { bilder: [] } })).toContainEqual({
      path: "vorhersage",
      key: "problem-predict-field",
    });
    expect(challengeProblems({ ...picture, checks: ["bild-gleich"] })).toContainEqual({
      path: "vorhersage",
      key: "problem-predict-field",
    });
  });
  it("refuses one wrong picture, and a wrong picture that is the right one", () => {
    expect(challengeProblems({ ...picture, vorhersage: { bilder: [square(50, "drehe-links-um")] } })).toContainEqual({
      path: "vorhersage",
      key: "problem-predict-pictures",
    });
    expect(
      challengeProblems({
        ...picture,
        vorhersage: { bilder: [square(50, "drehe-links-um"), square(50, "drehe-rechts-um")] },
      }),
    ).toContainEqual({ path: "vorhersage.bilder[1]", key: "problem-predict-same", params: { n: 1 } });
  });
});

describe("every wrong prediction of the built-in tasks gets its own feedback", () => {
  // Wrong ways: every prefix, the way one field longer, and every way that leaves the right one at some step. Wrong
  // pictures: each of them. Each must fail with a prediction feedback whose placeholders are all filled.
  const texts = { de, en } as Record<string, Record<string, string>>;
  const filled = (key: string, params: Record<string, unknown>): void => {
    for (const lang of ["de", "en"]) {
      const text = texts[lang]?.[key];
      expect(text, `${lang}: ${key}`).toBeDefined();
      for (const [, name] of (text ?? "").matchAll(/\{(\w+)\}/g))
        expect(params, `${key} needs ${name}`).toHaveProperty(name ?? "");
    }
  };
  const neighbours = (c: Challenge, n: number, way: string[]): string[] =>
    ["1,0", "-1,0", "0,1", "0,-1"]
      .map((d) => {
        const last = (way.at(-1) ?? startKey(c, n)).split(",").map(Number);
        const [dx, dy] = d.split(",").map(Number);
        return `${(last[0] ?? 0) + (dx ?? 0)},${(last[1] ?? 0) + (dy ?? 0)}`;
      })
      .filter((k) => withField(c, n, way, k) !== null);
  const startKey = (c: Challenge, n: number): string => {
    const map = (configAt(c, n) as { map: string[] }).map;
    const y = map.findIndex((r) => r.includes("S"));
    return `${map[y]?.indexOf("S") ?? 0},${y}`;
  };
  for (const [id, c] of Object.entries(BUILT_IN).filter(([, c]) => isPrediction(c)))
    it(id, () => {
      let tried = 0;
      for (let n = 1; n <= testCount(c); n++) {
        const run = runOf(c, n);
        expect(run?.status).toBe("done");
        if (run === null) continue;
        const wrong: Prediction[] = [];
        if (c.world.type === "labyrinth") {
          const right = (PREDICTIONS[id]?.[n - 1] ?? []) as string[];
          for (let k = 1; k < right.length; k++) wrong.push(right.slice(0, k));
          for (const extra of neighbours(c, n, right)) wrong.push([...right, extra]);
          for (let k = 0; k < right.length; k++)
            for (const other of neighbours(c, n, right.slice(0, k)))
              if (other !== right[k]) wrong.push([...right.slice(0, k), other]);
        } else
          picturesOf(c, n, 1).forEach((_, i) => {
            if (i !== PREDICTIONS[id]?.[n - 1]) wrong.push(i);
          });
        for (const p of wrong) {
          const verdict = judgePrediction(c, n, run, p, 1);
          expect(verdict.ok, JSON.stringify(p)).toBe(false);
          expect(verdict.why?.key).toMatch(/^fail-predict-/);
          filled(verdict.why?.key ?? "", verdict.why?.params ?? {});
          tried++;
        }
      }
      expect(tried).toBeGreaterThan(2);
    });
});
