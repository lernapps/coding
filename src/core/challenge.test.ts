import { describe, expect, it } from "vite-plus/test";
import { BUILT_IN, PREDICTIONS, SOLUTIONS } from "../data/index.ts";
import { challengeProblems, firstFailure, testCount } from "./challenge.ts";
import { isPrediction, judgePrediction, runOf } from "./prediction.ts";
import { runToEnd } from "./interpreter.ts";
import { labyrinth } from "./worlds/labyrinth.ts";

describe("built-in challenges", () => {
  for (const [id, challenge] of Object.entries(BUILT_IN)) {
    it(`${id} is valid`, () => expect(challengeProblems(challenge)).toEqual([]));
    if (isPrediction(challenge))
      it(`${id}: the model prediction passes every test case`, () => {
        const model = PREDICTIONS[id];
        expect(model).toHaveLength(testCount(challenge));
        for (let n = 1; n <= testCount(challenge); n++) {
          const run = runOf(challenge, n);
          expect(run).not.toBeNull();
          if (run !== null) expect(judgePrediction(challenge, n, run, model?.[n - 1] ?? null, 1)).toEqual({ ok: true });
        }
      });
    else
      it(`${id}: the model solution passes every test case`, () => {
        const solution = SOLUTIONS[id];
        expect(solution).toBeDefined();
        if (solution !== undefined) expect(firstFailure(challenge, solution)).toBeNull();
      });
  }
});

describe("challenge validation", () => {
  const good = BUILT_IN["labyrinth-1"];
  it("names the field of a problem", () => {
    expect(challengeProblems({ ...good, id: "Groß" })[0]?.path).toBe("id");
    expect(challengeProblems({ ...good, world: { type: "mond", version: 1, config: {} } })[0]?.key).toBe(
      "problem-world-type",
    );
    expect(challengeProblems({ ...good, world: { ...good?.world, version: 9 } })[0]?.key).toBe("problem-world-version");
    expect(
      challengeProblems({ ...good, back: { url: "informatik/ohne-schraegstrich", label: { de: "x" } } })[0]?.path,
    ).toBe("back.url");
    expect(challengeProblems({ ...good, title: { en: "Only English" } })[0]?.key).toBe("problem-text-german");
  });
  it("accepts a back path with a query", () => {
    expect(
      challengeProblems({ ...good, back: { url: "/informatik/schleifen/?a=3&b=12", label: { de: "Zurück" } } }),
    ).toEqual([]);
  });
});

describe("interpreter", () => {
  const config = { map: ["#####", "#S.Z#", "#####"], facing: "east" as const };
  it("stops an endless loop without commands at the step limit", () => {
    const run = runToEnd(
      { main: [{ s: "while", cond: { e: "num", value: 1 }, body: [] }] },
      labyrinth as never,
      config,
      50,
    );
    expect(run.status).toBe("limit");
  });
  it("names the field where the robot bumps into the wall", () => {
    const run = runToEnd(
      {
        main: [
          { s: "cmd", name: "links", args: [] },
          { s: "cmd", name: "vorwaerts", args: [] },
        ],
      },
      labyrinth as never,
      config,
      50,
    );
    expect(run.why).toEqual({ key: "fail-wall", params: { x: 2, y: 2 } });
  });
});

describe("turtle", () => {
  it("names where a picture differs", async () => {
    const { turtle } = await import("./worlds/turtle.ts");
    const num = (value: number) => ({ e: "num" as const, value });
    const config = { ziel: { main: [{ s: "cmd" as const, name: "gehe", args: [num(50)] }] } };
    const short = runToEnd({ main: [{ s: "cmd", name: "gehe", args: [num(40)] }] }, turtle as never, config, 50);
    expect(turtle.checks["bild-gleich"]?.(short.world as never, config)).toEqual({
      ok: false,
      why: { key: "fail-picture-missing", params: { x: 100, y: 50 } },
    });
  });
});

describe("hostile challenges", () => {
  const t = BUILT_IN["turtle-1"];
  const l = BUILT_IN["labyrinth-1"];
  const num = (value: number) => ({ e: "num", value });
  const turtleWith = (ziel: unknown) => ({ ...t, world: { type: "turtle", version: 1, config: { ziel } } });
  it("refuses a huge distance in the target picture", () => {
    expect(challengeProblems(turtleWith({ main: [{ s: "cmd", name: "gehe", args: [num(1e300)] }] }))[0]?.key).toBe(
      "problem-number",
    );
  });
  it("refuses a calculation in the target picture", () => {
    const big = { e: "arith", op: "*", a: num(1e200), b: num(1e200) };
    expect(challengeProblems(turtleWith({ main: [{ s: "cmd", name: "gehe", args: [big] }] }))).not.toEqual([]);
  });
  it("refuses a target picture with too many lines", () => {
    const many = {
      main: [
        {
          s: "repeat",
          times: num(99),
          body: [{ s: "repeat", times: num(3), body: [{ s: "cmd", name: "gehe", args: [num(5)] }] }],
        },
      ],
    };
    expect(challengeProblems(turtleWith(many))[0]?.key).toBe("problem-target-lines");
  });
  it("refuses a start program with a block of another world", () => {
    expect(challengeProblems({ ...l, start: { main: [{ s: "cmd", name: "gehe", args: [num(5)] }] } })[0]?.key).toBe(
      "problem-block",
    );
  });
  it("refuses a start program with a huge repeat", () => {
    const start = { main: [{ s: "repeat", times: num(1e9), body: [] }] };
    expect(challengeProblems({ ...l, start })[0]?.key).toBe("problem-number");
  });
});
