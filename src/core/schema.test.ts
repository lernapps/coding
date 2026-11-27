// Keeps the published schema (public/schemas/challenge.v1.schema.json) and the workshop's own validator alike: both
// accept the built-in challenges and both reject each broken variant the schema can express. Ajv runs only here, in
// the tests; the workshop never compiles a schema.
import Ajv2020 from "ajv/dist/2020.js";
import { describe, expect, it } from "vite-plus/test";
import schema from "../../public/schemas/challenge.v1.schema.json";
import { BUILT_IN } from "../data/index.ts";
import { challengeProblems } from "./challenge.ts";

const validate = new Ajv2020({ allErrors: true, strict: false }).compile(schema);
const base = BUILT_IN["labyrinth-2"] as unknown as Record<string, unknown>;
const turtleBase = BUILT_IN["turtle-1"] as unknown as Record<string, unknown>;

const broken: [string, Record<string, unknown>][] = [
  ["format 2", { ...base, format: 2 }],
  ["id with capitals", { ...base, id: "Treppe" }],
  ["no German title", { ...base, title: { en: "Stairs" } }],
  ["unknown language", { ...base, title: { de: "Treppe", fr: "Escalier" } }],
  ["empty task", { ...base, task: { de: " " } }],
  ["unknown world", { ...base, world: { type: "mond", version: 1, config: {} } }],
  ["world version 2", { ...base, world: { type: "labyrinth", version: 2, config: { map: ["S"], facing: "east" } } }],
  [
    "map with a letter",
    { ...base, world: { type: "labyrinth", version: 1, config: { map: ["#SXZ#"], facing: "east" } } },
  ],
  [
    "map too big",
    { ...base, world: { type: "labyrinth", version: 1, config: { map: Array(13).fill("#SZ"), facing: "east" } } },
  ],
  ["facing up", { ...base, world: { type: "labyrinth", version: 1, config: { map: ["#SZ#"], facing: "up" } } }],
  ["empty toolbox", { ...base, toolbox: [] }],
  ["unknown block", { ...base, toolbox: ["fliegen"] }],
  ["limits too high", { ...base, limits: { blocks: 500 } }],
  ["limits unknown field", { ...base, limits: { zeit: 3 } }],
  ["ten tests", { ...base, tests: Array(10).fill({ config: {} }) }],
  ["test without config", { ...base, tests: [{ map: [] }] }],
  ["no checks", { ...base, checks: [] }],
  ["unknown check", { ...base, checks: ["schnell"] }],
  ["four hints", { ...base, hints: Array(4).fill({ de: "Tipp" }) }],
  ["view text", { ...base, view: "text" }],
  ["back without slash", { ...base, back: { url: "informatik/", label: { de: "Zurück" } } }],
  ["back with fragment", { ...base, back: { url: "/informatik/#a", label: { de: "Zurück" } } }],
  ["back without label", { ...base, back: { url: "/informatik/" } }],
  ["start not a program", { ...base, start: { main: [{ s: "springen" }] } }],
  ["unknown field", { ...base, farbe: "rot" }],
  [
    "turtle start outside",
    {
      ...turtleBase,
      world: { type: "turtle", version: 1, config: { ziel: { main: [] }, start: { x: 300, y: 0, winkel: 0 } } },
    },
  ],
  ["one wrong picture", { ...turtleBase, checks: ["vorhersage"], vorhersage: { bilder: [{ main: [] }] } }],
  [
    "prediction pictures with an unknown field",
    { ...turtleBase, checks: ["vorhersage"], vorhersage: { bilder: [], farbe: 1 } },
  ],
];

describe("schema and validator", () => {
  for (const [id, challenge] of Object.entries(BUILT_IN))
    it(`both accept ${id}`, () => {
      expect(validate(challenge), JSON.stringify(validate.errors)).toBe(true);
      expect(challengeProblems(challenge)).toEqual([]);
    });
  it("both accept a back path per language", () => {
    const c = {
      ...base,
      back: {
        url: { de: "/informatik/schleifen/", en: "/en/informatik/schleifen/?a=2" },
        label: { de: "Zurück", en: "Back" },
      },
    };
    expect(validate(c)).toBe(true);
    expect(challengeProblems(c)).toEqual([]);
  });
  for (const [name, challenge] of broken)
    it(`both reject: ${name}`, () => {
      expect(validate(challenge)).toBe(false);
      expect(challengeProblems(challenge)).not.toEqual([]);
    });
});

describe("locked blocks and the sensor weg-frei", () => {
  const start = { main: [{ s: "while", cond: { e: "sense", name: "weg-frei", args: [] }, body: [], locked: true }] };
  it("both accept a locked start block and weg-frei", () => {
    const c = { ...base, toolbox: ["vorwaerts", "solange", "weg-frei"], start };
    expect(validate(c), JSON.stringify(validate.errors)).toBe(true);
    expect(challengeProblems(c)).toEqual([]);
  });
  it("both reject locked that is not true or false", () => {
    const c = { ...base, start: { main: [{ s: "cmd", name: "vorwaerts", args: [], locked: "ja" }] } };
    expect(validate(c)).toBe(false);
    expect(challengeProblems(c)).not.toEqual([]);
  });
});
