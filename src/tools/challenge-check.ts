// The check script for apps that send the workshop a challenge (published as tools/challenge-check.v1.mjs, one file
// without dependencies, Node 22 or newer): it checks a challenge as the workshop does, the length of its link, and,
// given a model solution, that the solution passes every test case; it prints the links. For a build step:
//
//   node challenge-check.v1.mjs aufgabe.json [loesung.json] [--lang en]
//
// Exit code 0 when everything holds, 1 when not, 2 on a usage error.
/// <reference types="node" />
import { readFileSync } from "node:fs";
import { deflateRawSync } from "node:zlib";
import { translator } from "@lernapps/tooling/i18n";
import { challengeProblems, firstFailure, MAX_LINK, type Challenge } from "../core/challenge.ts";
import { blocksOf, programProblems, type Program } from "../core/ir.ts";
import type { Msg } from "../core/json.ts";
import de from "../messages/de.json";
import en from "../messages/en.json";

const BASE = "https://lernapps.net/coding/";

function main(argv: readonly string[]): number {
  const lang = argv.includes("--lang") && argv[argv.indexOf("--lang") + 1] === "en" ? "en" : "de";
  const files = argv.filter((a, i) => !a.startsWith("--") && argv[i - 1] !== "--lang");
  const messages: Record<string, string> = lang === "en" ? en : de;
  const t = translator(messages, lang === "en" ? "en-GB" : "de-DE");
  const say = (m: Msg): string => t(m.key, m.params ?? {});
  const [challengeFile, solutionFile] = files;
  if (challengeFile === undefined) {
    process.stderr.write("node challenge-check.v1.mjs <challenge.json> [<solution.json>] [--lang en]\n");
    return 2;
  }
  const read = (file: string): unknown => JSON.parse(readFileSync(file, "utf8")) as unknown;
  let ok = true;
  const fail = (line: string): void => {
    ok = false;
    process.stdout.write(`✗ ${line}\n`);
  };
  let challenge: unknown;
  try {
    challenge = read(challengeFile);
  } catch {
    fail(`${challengeFile}: ${t("problem-json")}`);
    return 1;
  }
  const problems = challengeProblems(challenge);
  for (const p of problems)
    fail(`${challengeFile}: ${p.path === "" ? say(p) : t("problem-at", { path: p.path, what: say(p) })}`);
  if (problems.length > 0) return 1;
  const packed = deflateRawSync(Buffer.from(JSON.stringify(challenge)), { level: 9 }).toString("base64url");
  if (packed.length > MAX_LINK) fail(t("problem-too-long", { max: MAX_LINK }));
  if (solutionFile !== undefined) {
    let solution: unknown;
    try {
      solution = read(solutionFile);
    } catch {
      fail(`${solutionFile}: ${t("problem-json")}`);
      return 1;
    }
    const wrong = programProblems(solution);
    for (const p of wrong) fail(`${solutionFile}: ${t("problem-at", { path: p.path, what: say(p) })}`);
    const outside =
      wrong.length > 0
        ? []
        : blocksOf(solution as Program).filter((b) => !(challenge as Challenge).toolbox.includes(b));
    for (const b of new Set(outside)) fail(`${solutionFile}: ${t("problem-solution-block", { name: b })}`);
    if (wrong.length === 0) {
      const failure = firstFailure(challenge as Challenge, solution as Program);
      if (failure !== null)
        fail(
          `${solutionFile}: ${failure.test === 0 ? say(failure.why) : t("failed-test", { n: failure.test, why: say(failure.why) })}`,
        );
    }
  }
  if (ok) {
    process.stdout.write(
      `✓ ${t("authoring-valid")} ${t("authoring-length", { length: packed.length, max: MAX_LINK })}\n`,
    );
    process.stdout.write(`${t("authoring-link-de")} ${BASE}app/?c=${packed}\n`);
    process.stdout.write(`${t("authoring-link-en")} ${BASE}en/app/?c=${packed}\n`);
  }
  return ok ? 0 : 1;
}

process.exitCode = main(process.argv.slice(2));
