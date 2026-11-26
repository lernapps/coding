// The published check script: it is the build of src/tools/challenge-check.ts as it is now, and it accepts every
// built-in challenge with its model solution and rejects a wrong solution.
/// <reference types="node" />
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vite-plus/test";
import { sourceHash } from "../../scripts/check-script-source.ts";
import { BUILT_IN, SOLUTIONS } from "../data/index.ts";

const SCRIPT = "public/tools/challenge-check.v1.mjs";
const dir = mkdtempSync(join(tmpdir(), "challenge-check-"));
const run = (...args: string[]) => spawnSync("node", [SCRIPT, ...args], { encoding: "utf8" });

describe("check script", () => {
  it("is the build of its sources as they are (else: npm run build:check-script)", () => {
    expect(readFileSync(SCRIPT, "utf8").split("\n")[0]).toBe(`// source: ${sourceHash()}`);
  });
  for (const [id, challenge] of Object.entries(BUILT_IN))
    it(`accepts ${id} with its model solution`, () => {
      writeFileSync(join(dir, `${id}.json`), JSON.stringify(challenge));
      writeFileSync(join(dir, `${id}-loesung.json`), JSON.stringify(SOLUTIONS[id]));
      const result = run(join(dir, `${id}.json`), join(dir, `${id}-loesung.json`));
      expect(result.status, result.stdout).toBe(0);
      expect(result.stdout).toContain("https://lernapps.net/coding/app/?c=");
    });
  it("rejects a wrong solution and names the test case", () => {
    writeFileSync(join(dir, "leer.json"), JSON.stringify({ main: [{ s: "cmd", name: "links", args: [] }] }));
    const result = run(join(dir, "labyrinth-1.json"), join(dir, "leer.json"));
    expect(result.status).toBe(1);
    expect(result.stdout).toContain("Feld (2|2)");
  });
});
